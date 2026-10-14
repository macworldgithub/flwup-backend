const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  preset: { type: String, required: true, unique: true, index: true },
  title: { type: String, default: '' },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  updated_at: { type: Date, default: Date.now }
}, {
  timestamps: true,
  strict: false
});

module.exports = mongoose.model('Report', ReportSchema);
