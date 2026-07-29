const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/init');
const { record } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('login', { error: null });
});

router.post('/login', loginLimiter, (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

  if (!user) {
    record(username, 'LOGIN', 'failure', req.ip, 'unknown username');
    return res.render('login', { error: 'Invalid username or password.' });
  }

  const ok = bcrypt.compareSync(password || '', user.password_hash);
  if (!ok) {
    record(username, 'LOGIN', 'failure', req.ip, 'wrong password');
    return res.render('login', { error: 'Invalid username or password.' });
  }

  req.session.regenerate((err) => {
    if (err) {
      record(username, 'LOGIN', 'failure', req.ip, 'session error');
      return res.render('login', { error: 'Something went wrong. Try again.' });
    }
    req.session.user = { id: user.id, username: user.username, role: user.role };
    record(username, 'LOGIN', 'success', req.ip, `role=${user.role}`);
    res.redirect('/dashboard');
  });
});

router.get('/register', (req, res) => {
  if (req.session.user) return res.redirect('/dashboard');
  res.render('register', { error: null });
});

router.post('/register', (req, res) => {
  const { username, password, confirm } = req.body;

  if (!username || !password || password.length < 8) {
    return res.render('register', {
      error: 'Username required, password must be at least 8 characters.',
    });
  }
  if (password !== confirm) {
    return res.render('register', { error: 'Passwords do not match.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    record(username, 'REGISTER', 'failure', req.ip, 'username taken');
    return res.render('register', { error: 'That username is already taken.' });
  }

  const hash = bcrypt.hashSync(password, 12);
  db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run(
    username,
    hash,
    'member'
  );
  record(username, 'REGISTER', 'success', req.ip, 'role=member');
  res.redirect('/login');
});

router.post('/logout', (req, res) => {
  const username = req.session.user ? req.session.user.username : null;
  req.session.destroy(() => {
    if (username) record(username, 'LOGOUT', 'success', req.ip);
    res.redirect('/login');
  });
});

module.exports = router;
