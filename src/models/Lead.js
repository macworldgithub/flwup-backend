const mongoose = require('mongoose');

const QueuedMessageSchema = new mongoose.Schema({
  id: { type: mongoose.Schema.Types.Mixed },
  type: { type: String, default: 'sms' },
  content: { type: String, default: '' },
  scheduled_for: { type: String },
  editable: { type: Boolean, default: true }
}, { _id: false });

const DiaryEntrySchema = new mongoose.Schema({
  date: { type: String, default: () => new Date().toISOString() },
  user: { type: String, default: 'System' },
  note: { type: String, required: true }
}, { _id: false });

const LeadSchema = new mongoose.Schema({
  deal_id: { type: String, required: true, unique: true, index: true },
  dealership_id: { type: String, index: true },
  dealership_name: { type: String, default: 'South Morang Kia', index: true },
  dealer_code: { type: String, default: 'BOORAN', index: true },
  owner_name: { type: String, default: 'Unassigned', index: true },
  source: { type: String, default: 'manual', index: true },
  source_campaign: { type: String, default: '' },
  external_lead_id: { type: String, default: '' },
  customer_name: { type: String, required: true, index: true },
  customer_phone: { type: String, default: '' },
  customer_email: { type: String, default: '' },
  vehicle_make: { type: String, default: 'Unknown', index: true },
  vehicle_model: { type: String, default: '', index: true },
  created_at: { type: String, default: () => new Date().toISOString(), index: true },
  first_contact_at: { type: String, default: null },
  minutes_to_first_contact: { type: Number, default: null },
  first_touch_at: { type: String, default: null },
  minutes_to_first_touch: { type: Number, default: null },
  first_followup_due_at: { type: String, default: null },
  had_contact_opportunity: { type: Boolean, default: false },
  follow_ups_sent: { type: Number, default: 0 },
  first_reply_at: { type: String, default: null },
  status: { type: String, default: 'following_up', index: true },
  sold_at: { type: String, default: null },
  lost_reason: { type: String, default: null },
  days_to_sold: { type: Number, default: null },

  // Pentana System of Record Fields
  pentana_id: { type: String, index: true },
  store_code: { type: String, default: 'Store 70', index: true },

  // AI & Automation
  ai_status: { type: String, enum: ['active', 'off'], default: 'active', index: true },
  ai_schedule_preference: { type: String, default: 'after_hours' },
  ai_queued_messages: [QueuedMessageSchema],

  // Diary and Interaction Log
  diary_entries: [DiaryEntrySchema],

  // Sales Workflow Modules
  test_drive: {
    status: { type: String, default: 'none' },
    licence_captured: { type: Boolean, default: false }
  },
  trade_in: {
    status: { type: String, default: 'none' },
    value: { type: Number, default: null }
  },
  loan_car: {
    status: { type: String, default: 'none' }
  },
  post_sales_followup: {
    status: { type: String, default: 'n/a' },
    next_contact: { type: String, default: null }
  },
  videos_sent: [{
    id: { type: String },
    sent_via: { type: String },
    interacted: { type: Boolean, default: false },
    interacted_at: { type: String },
    is_snippet_blend: { type: Boolean, default: true },
    no_time_cap: { type: Boolean, default: true }
  }]
}, {
  timestamps: true,
  strict: false // Allow any additional fields from FLWUP or Pentana
});

// Compound indexes for high performance sorting & filtering
LeadSchema.index({ dealership_name: 1, status: 1 });
LeadSchema.index({ created_at: -1 });

module.exports = mongoose.model('Lead', LeadSchema);
