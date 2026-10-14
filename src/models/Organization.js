const mongoose = require('mongoose');

const OrganizationSchema = new mongoose.Schema({
  org_id: { type: String, default: 'default', unique: true },
  name: { type: String, default: 'Boran Motors Group' },
  short_name: { type: String, default: 'Boran Motors' },
  dealer_group_code: { type: String, default: 'BOORAN-MOTORS-VIC' },
  theme: { type: mongoose.Schema.Types.Mixed, default: {} },
  current_user: { type: mongoose.Schema.Types.Mixed, default: {} },
  meta: { type: mongoose.Schema.Types.Mixed, default: {} }
}, {
  timestamps: true,
  strict: false
});

module.exports = mongoose.model('Organization', OrganizationSchema);
