const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const nstpRoutes = require('./routes/nstpRoutes');
const nstpRequirementRoutes = require('./routes/nstpRequirementRoutes');
const nstpCommunityRequestRoutes = require('./routes/nstpCommunityRequestRoutes');
const dssMatchingRoutes = require('./routes/dssMatchingRoutes');
const deploymentRoutes = require('./routes/deploymentRoutes');
const communityRoutes = require('./routes/communityRoutes');
const communityRequestRoutes = require('./routes/communityRequestRoutes');
const studentAuthRoutes = require('./routes/studentAuthRoutes');
const studentDashboardRoutes = require('./routes/studentDashboardRoutes');
const studentProfileRoutes = require('./routes/studentProfileRoutes');
const studentCmoRequirementRoutes = require('./routes/studentCmoRequirementRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const renderedHoursRoutes = require('./routes/renderedHoursRoutes');
const makeUpRequestRoutes = require('./routes/makeUpRequestRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
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

// NSTP Official Dashboard
app.get('/nstp/dashboard.html', isAuthenticated, roleMiddleware('nstp_official'), (req, res) => {
  res.sendFile(path.join(__dirname, '../public/nstp/dashboard.html'));
});

// NSTP Official Deployment Management Pages
app.get('/nstp/deployment-management.html', isAuthenticated, roleMiddleware('nstp_official'), (req, res) => {
  res.sendFile(path.join(__dirname, '../public/nstp/deployment-management.html'));
});

app.get('/nstp/view-deployment.html', isAuthenticated, roleMiddleware('nstp_official'), (req, res) => {
  res.sendFile(path.join(__dirname, '../public/nstp/view-deployment.html'));
});

// NSTP Official DSS Matching Pages
app.get('/nstp/dss-matching.html', isAuthenticated, roleMiddleware('nstp_official'), (req, res) => {
  res.sendFile(path.join(__dirname, '../public/nstp/dss-matching.html'));
});

app.get('/nstp/student-match-profile.html', isAuthenticated, roleMiddleware('nstp_official'), (req, res) => {
  res.sendFile(path.join(__dirname, '../public/nstp/student-match-profile.html'));
});

// NSTP Official Requirement Compliance Pages
app.get('/nstp/requirement-compliance.html', isAuthenticated, roleMiddleware('nstp_official'), (req, res) => {
  res.sendFile(path.join(__dirname, '../public/nstp/requirement-compliance.html'));
});

app.get('/nstp/review-requirements.html', isAuthenticated, roleMiddleware('nstp_official'), (req, res) => {
  res.sendFile(path.join(__dirname, '../public/nstp/review-requirements.html'));
});

// NSTP Official User Management Page
app.get('/nstp/user-management.html', isAuthenticated, roleMiddleware('nstp_official'), (req, res) => {
  res.sendFile(path.join(__dirname, '../public/nstp/user-management.html'));
});

// NSTP Official Student Records Page
app.get('/nstp/student-records.html', isAuthenticated, roleMiddleware('nstp_official'), (req, res) => {
  res.sendFile(path.join(__dirname, '../public/nstp/student-records.html'));
});

// NSTP Official Community Requests Page
app.get('/nstp/community-requests.html', isAuthenticated, roleMiddleware('nstp_official'), (req, res) => {
  res.sendFile(path.join(__dirname, '../public/nstp/community-requests.html'));
});

// NSTP Official Community Officials Page
app.get('/nstp/community-officials.html', isAuthenticated, roleMiddleware('nstp_official'), (req, res) => {
  res.sendFile(path.join(__dirname, '../public/nstp/community-officials.html'));
});

// NSTP Official Attendance Management Pages
app.get('/nstp/attendance-management.html', isAuthenticated, roleMiddleware('nstp_official'), (req, res) => {
  res.sendFile(path.join(__dirname, '../public/nstp/attendance-management.html'));
});

app.get('/nstp/rendered-hours.html', isAuthenticated, roleMiddleware('nstp_official'), (req, res) => {
  res.sendFile(path.join(__dirname, '../public/nstp/rendered-hours.html'));
});

app.get('/nstp/make-up-requests.html', isAuthenticated, roleMiddleware('nstp_official'), (req, res) => {
  res.sendFile(path.join(__dirname, '../public/nstp/make-up-requests.html'));
});

// Community Official Dashboard
app.get('/community/dashboard.html', isAuthenticated, roleMiddleware('community_official'), (req, res) => {
  res.sendFile(path.join(__dirname, '../public/community/dashboard.html'));
});

// Community Official Request Management Pages
app.get('/community/community-requests.html', isAuthenticated, roleMiddleware('community_official'), (req, res) => {
  res.sendFile(path.join(__dirname, '../public/community/community-requests.html'));
});

app.get('/community/create-request.html', isAuthenticated, roleMiddleware('community_official'), (req, res) => {
  res.sendFile(path.join(__dirname, '../public/community/create-request.html'));
});

app.get('/community/view-request.html', isAuthenticated, roleMiddleware('community_official'), (req, res) => {
  res.sendFile(path.join(__dirname, '../public/community/view-request.html'));
});

app.get('/community/edit-request.html', isAuthenticated, roleMiddleware('community_official'), (req, res) => {
  res.sendFile(path.join(__dirname, '../public/community/edit-request.html'));
});

// Student Dashboard and Pages
app.get('/student/dashboard.html', isAuthenticated, roleMiddleware('student'), (req, res) => {
  res.sendFile(path.join(__dirname, '../public/student/dashboard.html'));
});

app.get('/student/complete-profile.html', isAuthenticated, roleMiddleware('student'), (req, res) => {
  res.sendFile(path.join(__dirname, '../public/student/complete-profile.html'));
});

app.get('/student/edit-profile.html', isAuthenticated, roleMiddleware('student'), (req, res) => {
  res.sendFile(path.join(__dirname, '../public/student/edit-profile.html'));
});

app.get('/student/cmo-requirements.html', isAuthenticated, roleMiddleware('student'), (req, res) => {
  res.sendFile(path.join(__dirname, '../public/student/cmo-requirements.html'));
});

app.get('/student/attendance.html', isAuthenticated, roleMiddleware('student'), (req, res) => {
  res.sendFile(path.join(__dirname, '../public/student/attendance.html'));
});

app.get('/student/my-hours.html', isAuthenticated, roleMiddleware('student'), (req, res) => {
  res.sendFile(path.join(__dirname, '../public/student/my-hours.html'));
});

app.get('/student/make-up-request.html', isAuthenticated, roleMiddleware('student'), (req, res) => {
  res.sendFile(path.join(__dirname, '../public/student/make-up-request.html'));
});

// Test dashboard for debugging
app.get('/student/test-dashboard.html', isAuthenticated, roleMiddleware('student'), (req, res) => {
  res.sendFile(path.join(__dirname, '../public/student/test-dashboard.html'));
});

// ─── Static Files ─────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../public')));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/nstp', nstpRoutes);
app.use('/api/nstp', nstpRequirementRoutes);
app.use('/api/nstp', nstpCommunityRequestRoutes);
app.use('/api/nstp/dss', dssMatchingRoutes);
app.use('/api/nstp/deployments', deploymentRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/community', communityRequestRoutes);
app.use('/api/student', studentAuthRoutes);
app.use('/api/student', studentDashboardRoutes);
app.use('/api/student', studentProfileRoutes);
app.use('/api/student/cmo-requirements', studentCmoRequirementRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/rendered-hours', renderedHoursRoutes);
app.use('/api/make-up-requests', makeUpRequestRoutes);
app.use('/api/notifications', notificationRoutes);

// ─── Root Redirect ────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.redirect('/login.html');
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
