const express = require('express');
const db = require('../db/init');
const { requireAuth, record } = require('../middleware/auth');

const router = express.Router();

router.get('/dashboard', requireAuth, (req, res) => {
  const { role, username } = req.session.user;

  const resources =
    role === 'admin'
      ? db.prepare('SELECT * FROM resources ORDER BY id').all()
      : db.prepare('SELECT * FROM resources WHERE min_role = ? ORDER BY id').all('member');

  record(username, 'VIEW_RESOURCES', 'success', req.ip, `count=${resources.length}`);

  res.render('dashboard', { user: req.session.user, resources });
});

module.exports = router;
