const mongoose = require('mongoose');

const CatalogSchema = new mongoose.Schema({
  catalog_id: { type: String, default: 'default', unique: true },
  data: { type: mongoose.Schema.Types.Mixed, default: {} }
}, {
  timestamps: true,
  strict: false
});

module.exports = mongoose.model('Catalog', CatalogSchema);
