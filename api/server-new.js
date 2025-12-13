const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const { generateTips } = require('./okosfoci-algoritmus');

/**
 * Okosfoci API Server
 * 
 * Provides a safe JSON API for mobile APK consumption
 * Always returns JSON, never HTML error pages
 */

const app = express();

// ======= MIDDLEWARE =======
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Ensure all responses are JSON (never HTML)
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// ======= HEALTH CHECK =======
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'okosfoci-api'
  });
});

// ======= TIPPEK ENDPOINT =======
app.get('/tippek', async (req, res) => {
  try {
    // Parse query parameters
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const timeWindow = req.query.timeWindow || req.query.window || 'all';
    const limit = parseInt(req.query.limit || '20', 10);
    
    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({
        ok: false,
        error: 'Invalid date format. Use YYYY-MM-DD',
        date: date
      });
    }
    
    // Validate time window
    const validTimeWindows = ['all', '0-8', '8-16', '16-24'];
    if (!validTimeWindows.includes(timeWindow)) {
      return res.status(400).json({
        ok: false,
        error: 'Invalid time window. Use: all, 0-8, 8-16, or 16-24',
        timeWindow: timeWindow
      });
    }
    
    // Validate limit
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return res.status(400).json({
        ok: false,
        error: 'Invalid limit. Must be between 1 and 100',
        limit: req.query.limit
      });
    }
    
    console.log(`Generating tips for date=${date}, timeWindow=${timeWindow}, limit=${limit}`);
    
    // Generate tips using the algorithm
    const tips = await generateTips({
      date,
      timeWindow,
      maxMatches: limit,
      apiKey: process.env.X_APISPORTS_KEY
    });
    
    // Return response
    res.json({
      ok: true,
      date,
      timeWindow,
      count: tips.length,
      tips: tips
    });
    
  } catch (error) {
    console.error('Error in /tippek endpoint:', error);
    
    // Always return JSON, even on error
    res.status(500).json({
      ok: false,
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// ======= ROOT ENDPOINT =======
app.get('/', (req, res) => {
  res.json({
    ok: true,
    service: 'Okosfoci API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      tips: 'GET /tippek?date=YYYY-MM-DD&timeWindow=all|0-8|8-16|16-24&limit=N'
    },
    documentation: 'See README.md for detailed usage instructions'
  });
});

// ======= 404 HANDLER (JSON) =======
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

// ======= ERROR HANDLER (JSON) =======
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  res.status(err.status || 500).json({
    ok: false,
    error: err.message || 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// ======= START SERVER =======
const PORT = process.env.PORT || 8081;

app.listen(PORT, '0.0.0.0', () => {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║         Okosfoci API Server Running            ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log(`\n🌐 Server: http://0.0.0.0:${PORT}`);
  console.log(`📅 Endpoints:`);
  console.log(`   GET /health - Health check`);
  console.log(`   GET /tippek?date=YYYY-MM-DD&timeWindow=all&limit=20`);
  console.log(`\n💡 Example:`);
  console.log(`   curl "http://localhost:${PORT}/tippek?date=2024-12-13&timeWindow=all&limit=10"`);
  console.log(`\n📝 API Key: ${process.env.X_APISPORTS_KEY ? '✓ Loaded' : '❌ Missing (set X_APISPORTS_KEY)'}`);
  console.log('');
});

module.exports = app;
