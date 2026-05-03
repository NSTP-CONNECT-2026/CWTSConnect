const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const studentAuthRoutes = require('./routes/studentAuthRoutes');
const studentDashboardRoutes = require('./routes/studentDashboardRoutes');
const studentProfileRoutes = require('./routes/studentProfileRoutes');
const studentCmoRequirementRoutes = require('./routes/studentCmoRequirementRoutes');
const { isAuthenticated } = require('./middlewares/authMiddleware');
const { roleMiddleware } = require('./middlewares/roleMiddleware');

const app = express();

// ─── Security Headers ────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false // Disable for simplicity; configure properly in production
}));

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: true,
  credentials: true
}));

// ─── Health Check Endpoint ───────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'NSTPConnect API is running!',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// ─── Session ──────────────────────────────────────────────────────────────────
app.use(session({
  secret: process.env.SESSION_SECRET || 'nstp-connect-session-secret-2024',
  resave: false,
  saveUninitialized: false,
  name: 'nstp.connect.sid', // Custom session name
  cookie: {
    httpOnly: true,      // Prevent JavaScript access to cookie
    secure: false,       // Set to true in production with HTTPS
    maxAge: 1000 * 60 * 60 * 8, // 8 hours
    sameSite: 'lax'      // CSRF protection
  }
}));

// ─── Protected Page Routes (MUST BE BEFORE STATIC FILES) ─────────────────────
// Test dashboard for debugging
app.get('/student/test-dashboard.html', isAuthenticated, roleMiddleware('student'), (req, res) => {
  res.sendFile(path.join(__dirname, '../public/student/test-dashboard.html'));
});

// Serve dashboard only to logged-in students
app.get('/student/dashboard.html', isAuthenticated, roleMiddleware('student'), (req, res) => {
  res.sendFile(path.join(__dirname, '../public/student/dashboard.html'));
});

// Serve profile pages only to logged-in students
app.get('/student/complete-profile.html', isAuthenticated, roleMiddleware('student'), (req, res) => {
  res.sendFile(path.join(__dirname, '../public/student/complete-profile.html'));
});

app.get('/student/profile.html', isAuthenticated, roleMiddleware('student'), (req, res) => {
  res.sendFile(path.join(__dirname, '../public/student/profile.html'));
});

app.get('/student/edit-profile.html', isAuthenticated, roleMiddleware('student'), (req, res) => {
  res.sendFile(path.join(__dirname, '../public/student/edit-profile.html'));
});

// Serve CMO requirements page only to logged-in students
app.get('/student/cmo-requirements.html', isAuthenticated, roleMiddleware('student'), (req, res) => {
  res.sendFile(path.join(__dirname, '../public/student/cmo-requirements.html'));
});

// ─── Static Files ─────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../public')));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/student', studentAuthRoutes);
app.use('/api/student', studentDashboardRoutes);
app.use('/api/student', studentProfileRoutes);
app.use('/api/student/cmo-requirements', studentCmoRequirementRoutes);

// ─── Root Redirect ────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.redirect('/student/login.html');
});

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: 'An internal server error occurred.' });
});

module.exports = app;
