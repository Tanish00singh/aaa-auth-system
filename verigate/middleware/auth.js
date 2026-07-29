const db = require('../db/init');

// ---- Accounting: append-only audit trail ----
const insertLog = db.prepare(
  'INSERT INTO audit_log (actor, action, status, ip, detail) VALUES (?, ?, ?, ?, ?)'
);

function record(actor, action, status, ip, detail = '') {
  insertLog.run(actor || 'anonymous', action, status, ip || '-', detail);
}

// ---- Accounting: lightweight in-memory "who is online now" map ----
// Distinct from audit_log (permanent history) and users table (all registered accounts).
const activeSessions = new Map(); // sessionID -> { username, role, lastSeen }

function trackActivity(req, res, next) {
  if (req.session && req.session.user) {
    activeSessions.set(req.sessionID, {
      username: req.session.user.username,
      role: req.session.user.role,
      lastSeen: new Date().toISOString(),
    });
  }
  next();
}

function currentlyOnline() {
  const cutoff = Date.now() - 5 * 60 * 1000; // 5 minute presence window
  const online = [];
  for (const [sid, info] of activeSessions.entries()) {
    if (new Date(info.lastSeen).getTime() >= cutoff) {
      online.push(info);
    } else {
      activeSessions.delete(sid);
    }
  }
  return online;
}

// ---- Authentication gate ----
function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    record(null, 'AUTHENTICATION_DENIED', 'failure', req.ip, `path=${req.originalUrl}`);
    return res.redirect('/login');
  }
  next();
}

// ---- Authorization gate ----
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      record(null, 'AUTHENTICATION_DENIED', 'failure', req.ip, `path=${req.originalUrl}`);
      return res.redirect('/login');
    }
    if (!roles.includes(req.session.user.role)) {
      record(
        req.session.user.username,
        'AUTHORIZATION_DENIED',
        'failure',
        req.ip,
        `path=${req.originalUrl} requiredRole=${roles.join(',')}`
      );
      return res.status(403).render('error', {
        title: 'Access denied',
        message: "You're signed in, but your role doesn't permit this page.",
      });
    }
    next();
  };
}

module.exports = {
  record,
  trackActivity,
  currentlyOnline,
  activeSessions,
  requireAuth,
  requireRole,
};
