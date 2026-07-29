const express = require('express');
const db = require('../db/init');
const { requireRole, currentlyOnline, record } = require('../middleware/auth');

const router = express.Router();

router.get('/admin', requireRole('admin'), (req, res) => {
  const users = db.prepare('SELECT id, username, role, created_at FROM users ORDER BY id').all();
  const auditLog = db.prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT 200').all();
  const online = currentlyOnline();

  const failedLoginsLast24h = db
    .prepare(
      `SELECT COUNT(*) AS c FROM audit_log
       WHERE action = 'LOGIN' AND status = 'failure'
       AND ts >= datetime('now', '-1 day')`
    )
    .get().c;

  const totalEvents = db.prepare('SELECT COUNT(*) AS c FROM audit_log').get().c;

  res.render('admin', {
    user: req.session.user,
    users,
    auditLog,
    online,
    stats: {
      onlineNow: online.length,
      totalUsers: users.length,
      failedLoginsLast24h,
      totalEvents,
    },
  });
});

router.post('/admin/promote/:id', requireRole('admin'), (req, res) => {
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!target) return res.redirect('/admin');

  const newRole = target.role === 'admin' ? 'member' : 'admin';
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(newRole, target.id);

  record(
    req.session.user.username,
    'ROLE_CHANGE',
    'success',
    req.ip,
    `target=${target.username} newRole=${newRole}`
  );

  res.redirect('/admin');
});

module.exports = router;
