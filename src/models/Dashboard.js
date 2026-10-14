const mongoose = require('mongoose');

const DashboardSchema = new mongoose.Schema({
  key: { type: String, default: 'main', unique: true },
  data: { type: mongoose.Schema.Types.Mixed, default: {} }
}, {
  timestamps: true,
  strict: false
});

module.exports = mongoose.model('Dashboard', DashboardSchema);
