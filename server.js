// server.js (updated)
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const contactRoutes = require('./routes/contact');
const path = require('path'); // changed: add path for static serving

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0'; // changed: bind to 0.0.0.0 by default
const NODE_ENV = process.env.NODE_ENV || 'development';

// Security & parsing
app.use(helmet());
app.use(express.json({ limit: '10kb' }));

// CORS - restrict in production
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || '*';
app.use(cors({ origin: FRONTEND_ORIGIN }));

// Rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX || '50', 10),
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Routes
app.use('/api/contact', contactRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// changed: serve a frontend build directory if provided (set FRONTEND_BUILD_DIR env to e.g. ../frontend/build)
const FRONTEND_BUILD_DIR = process.env.FRONTEND_BUILD_DIR;
if (FRONTEND_BUILD_DIR) {
  const buildPath = path.join(__dirname, FRONTEND_BUILD_DIR);
  app.use(express.static(buildPath));
  // fallback to index.html for SPA routes
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path === '/health') return next();
    res.sendFile(path.join(buildPath, 'index.html'), err => {
      if (err) next(err);
    });
  });
} else {
  // changed: ensure GET / responds to avoid "Cannot GET /"
  app.get('/', (req, res) => {
    res.json({ service: 'MyInsight.info backend', status: 'running', env: NODE_ENV });
  });
}

// Optional: avoid mongoose deprecation warnings for strictQuery if you want explicit behavior
// mongoose.set('strictQuery', true); // or false, depending on your preference

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('FATAL: MONGO_URI missing in environment. Exiting.');
  process.exit(1);
}

// Start the Express server
function startServer() {
  app.listen(PORT, HOST, () => {
    console.log(`🚀 Server running on http://${HOST}:${PORT} (${NODE_ENV})`);
  });
}

// Try to connect to MongoDB, but allow continuing in development when desired.
async function connectAndStart() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('📦 Connected to MongoDB');
    startServer();
  } catch (err) {
    console.error('MongoDB connection error:', err);
    // Control behavior via EXIT_ON_DB_FAILURE env var (set to 'false' to continue without DB)
    const exitOnDbFail = process.env.EXIT_ON_DB_FAILURE !== 'false';
    if (exitOnDbFail) {
      process.exit(1);
    } else {
      console.warn('Continuing without MongoDB because EXIT_ON_DB_FAILURE=false');
      startServer();
    }
  }
}

connectAndStart();
