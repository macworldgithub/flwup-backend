const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const dotenv = require('dotenv');
const swaggerUi = require('swagger-ui-express');

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const connectDB = require('./config/db');
const swaggerSpec = require('./config/swagger');
const Lead = require('./models/Lead');
const runMigration = require('./scripts/migrate');

// Route imports
const leadsRoutes = require('./routes/leadsRoutes');
const rooftopsRoutes = require('./routes/rooftopsRoutes');
const reportsRoutes = require('./routes/reportsRoutes');
const kpisRoutes = require('./routes/kpisRoutes');
const orgRoutes = require('./routes/orgRoutes');
const systemRoutes = require('./routes/systemRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(morgan('dev'));

// Swagger UI Documentation
const swaggerOptions = {
  customSiteTitle: 'Boran Motors CRM — Swagger API Documentation',
  customCss: `
    .swagger-ui .topbar { background-color: #1a1a24; border-bottom: 2px solid #C8102E; }
    .swagger-ui .topbar .topbar-wrapper a span { color: #fff; font-weight: 700; }
    .swagger-ui .info .title { color: #C8102E; }
  `
};

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerOptions));
app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerOptions));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerOptions));

// Raw OpenAPI JSON endpoint
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Root landing page
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Boran Motors CRM API</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f1117; color: #e2e8f0; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
        .card { background: #1a1d26; border: 1px solid #2d3343; padding: 40px; border-radius: 12px; max-width: 600px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        h1 { color: #C8102E; margin-top: 0; }
        a.btn { display: inline-block; background: #C8102E; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; margin-top: 16px; transition: background 0.2s; }
        a.btn:hover { background: #a50d26; }
        .badge { display: inline-block; background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); padding: 4px 10px; border-radius: 20px; font-size: 13px; font-weight: 600; }
        ul { padding-left: 20px; color: #94a3b8; }
        li { margin-bottom: 6px; }
        code { background: #242938; padding: 2px 6px; border-radius: 4px; color: #f1f5f9; font-size: 13px; }
      </style>
    </head>
    <body>
      <div class="card">
        <span class="badge">● Online & Localhost DB Connected</span>
        <h1>Boran Motors CRM Backend</h1>
        <p>RESTful APIs are running with complete Swagger documentation and local MongoDB database integration.</p>
        <h3>Available Resources:</h3>
        <ul>
          <li>Interactive Swagger UI: <a href="/api-docs" style="color: #60a5fa;"><code>/api-docs</code></a></li>
          <li>System Health: <a href="/api/health" style="color: #60a5fa;"><code>/api/health</code></a></li>
          <li>Leads API (CRUD): <a href="/api/leads" style="color: #60a5fa;"><code>/api/leads</code></a></li>
          <li>Live KPIs: <a href="/api/kpis" style="color: #60a5fa;"><code>/api/kpis</code></a></li>
          <li>Dealership Rooftops: <a href="/api/rooftops" style="color: #60a5fa;"><code>/api/rooftops</code></a></li>
          <li>Scoreboards & Reports: <a href="/api/reports" style="color: #60a5fa;"><code>/api/reports</code></a></li>
        </ul>
        <a class="btn" href="/api-docs">Open Swagger Documentation →</a>
      </div>
    </body>
    </html>
  `);
});

// Mount API Routes
app.use('/api/leads', leadsRoutes);
app.use('/api/rooftops', rooftopsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/kpis', kpisRoutes);
app.use('/api', kpisRoutes); // handles /api/filters
app.use('/api/organization', orgRoutes);
app.use('/api', systemRoutes); // handles /api/health and /api/system/migrate

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

// Start Server & Initialize Database
async function startServer() {
  await connectDB();

  // Check if database needs initial seeding
  try {
    const leadCount = await Lead.countDocuments();
    if (leadCount === 0) {
      console.log('📦 Database is empty! Auto-running initial JSON migration...');
      await runMigration();
    } else {
      console.log(`📦 Database verified: ${leadCount} leads already in MongoDB.`);
    }
  } catch (err) {
    console.warn('⚠️ Seeding check error:', err.message);
  }

  app.listen(PORT, () => {
    console.log(`\n====================================================`);
    console.log(`🚀 Boran Motors CRM Server running on port ${PORT}`);
    console.log(`📑 Swagger Documentation:  http://localhost:${PORT}/api-docs`);
    console.log(`🩺 Health Endpoint:       http://localhost:${PORT}/api/health`);
    console.log(`🔌 Database URL:          ${process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/flwup_crm'}`);
    console.log(`====================================================\n`);
  });
}

startServer();

module.exports = app;
