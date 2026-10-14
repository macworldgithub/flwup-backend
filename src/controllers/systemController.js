const mongoose = require('mongoose');
const Lead = require('../models/Lead');
const Rooftop = require('../models/Rooftop');
const Report = require('../models/Report');
const runMigration = require('../scripts/migrate');

/**
 * @desc System health check & database status
 * @route GET /api/health
 */
exports.getHealth = async (req, res) => {
  try {
    const isConnected = mongoose.connection.readyState === 1;
    const [leadCount, rooftopCount, reportCount] = await Promise.all([
      Lead.countDocuments().catch(() => 0),
      Rooftop.countDocuments().catch(() => 0),
      Report.countDocuments().catch(() => 0)
    ]);

    return res.json({
      success: true,
      status: 'online',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: {
        type: 'MongoDB',
        status: isConnected ? 'connected' : 'disconnected',
        host: mongoose.connection.host || '127.0.0.1',
        port: mongoose.connection.port || 27017,
        name: mongoose.connection.name || 'flwup_crm',
        collections: {
          leads: leadCount,
          rooftops: rooftopCount,
          reports: reportCount
        }
      }
    });
  } catch (error) {
    console.error('Error in getHealth:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc Trigger manual migration/re-seed from JSON files
 * @route POST /api/system/migrate
 */
exports.triggerMigration = async (req, res) => {
  try {
    await runMigration();
    return res.json({
      success: true,
      message: 'Database migration triggered and completed successfully'
    });
  } catch (error) {
    console.error('Error in triggerMigration:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
