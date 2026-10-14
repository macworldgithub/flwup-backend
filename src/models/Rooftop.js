const mongoose = require('mongoose');

const RooftopSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  active: { type: Boolean, default: true },
  tier: { type: String, default: 'standard' },
  has_post_sale_template: { type: Boolean, default: true },
  dealer_code: { type: String, default: 'BOORAN' },
  timezone: { type: String, default: 'Australia/Melbourne' },
  brand: { type: String, default: '' }
}, {
  timestamps: true,
  strict: false
});

module.exports = mongoose.model('Rooftop', RooftopSchema);
