const path = require('path');
const express = require('express');
const session = require('express-session');

const { trackActivity } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'verigate-dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 4, // 4 hours
    },
  })
);

app.use(trackActivity);

app.get('/', (req, res) => res.redirect(req.session.user ? '/dashboard' : '/login'));

app.use(authRoutes);
app.use(dashboardRoutes);
app.use(adminRoutes);

app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Not found',
    message: "That page doesn't exist.",
  });
});

app.listen(PORT, () => {
  console.log(`VeriGate running at http://localhost:${PORT}`);
});
