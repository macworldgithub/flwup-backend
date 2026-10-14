const Lead = require('../models/Lead');

/**
 * @desc Get all leads with filtering, search, sorting & pagination
 * @route GET /api/leads
 */
exports.getLeads = async (req, res) => {
  try {
    const {
      search,
      store,
      aiStatus,
      dealership,
      status,
      owner,
      make,
      speed,
      sortBy = 'created_at',
      sortDir = 'desc',
      page = 1,
      limit = 25
    } = req.query;

    const query = {};

    // 1. Text Search
    if (search && search.trim()) {
      const q = search.trim();
      const regex = new RegExp(q, 'i');
      query.$or = [
        { customer_name: regex },
        { deal_id: regex },
        { pentana_id: regex },
        { store_code: regex },
        { vehicle_make: regex },
        { vehicle_model: regex },
        { owner_name: regex },
        { dealership_name: regex },
        { dealer_code: regex },
        { source: regex }
      ];
    }

    // 2. Store filter
    if (store && store !== 'all') {
      query.store_code = store;
    }

    // 3. AI Status
    if (aiStatus && aiStatus !== 'all') {
      query.ai_status = aiStatus;
    }

    // 4. Dealership
    if (dealership && dealership !== 'all') {
      query.dealership_name = dealership;
    }

    // 5. Status
    if (status && status !== 'all') {
      query.status = status;
    }

    // 6. Owner
    if (owner && owner !== 'all') {
      query.owner_name = owner;
    }

    // 7. Make
    if (make && make !== 'all') {
      query.vehicle_make = make;
    }

    // 8. Speed to lead SLA
    if (speed && speed !== 'all') {
      if (speed === 'fast') {
        query.minutes_to_first_contact = { $ne: null, $lte: 15 };
      } else if (speed === 'moderate') {
        query.minutes_to_first_contact = { $gt: 15, $lte: 60 };
      } else if (speed === 'slow') {
        query.minutes_to_first_contact = { $gt: 60 };
      } else if (speed === 'untouched') {
        query.$or = [
          { minutes_to_first_contact: null },
          { first_contact_at: null }
        ];
      }
    }

    // Sorting
    const sort = {};
    const direction = sortDir === 'asc' ? 1 : -1;
    sort[sortBy] = direction;

    // Check if client requested ALL leads (for full dataset caching or offline export)
    const isAll = limit === 'all' || limit === '0' || Number(limit) === 0;

    const total = await Lead.countDocuments(query);

    let leadsQuery = Lead.find(query).sort(sort);

    if (!isAll) {
      const pageNum = Math.max(1, parseInt(page, 10));
      const pageSize = Math.max(1, parseInt(limit, 10));
      const skip = (pageNum - 1) * pageSize;
      leadsQuery = leadsQuery.skip(skip).limit(pageSize);

      const leads = await leadsQuery.lean();

      return res.json({
        success: true,
        count: leads.length,
        total,
        page: pageNum,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
        data: leads
      });
    }

    const leads = await leadsQuery.lean();
    return res.json({
      success: true,
      count: leads.length,
      total,
      page: 1,
      pageSize: leads.length,
      totalPages: 1,
      data: leads
    });
  } catch (error) {
    console.error('Error in getLeads:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc Get single lead by ID or deal_id
 * @route GET /api/leads/:id
 */
exports.getLeadById = async (req, res) => {
  try {
    const { id } = req.params;
    let lead = null;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      lead = await Lead.findById(id).lean();
    }
    if (!lead) {
      lead = await Lead.findOne({ deal_id: id }).lean();
    }

    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    return res.json({ success: true, data: lead });
  } catch (error) {
    console.error('Error in getLeadById:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc Create a new lead
 * @route POST /api/leads
 */
exports.createLead = async (req, res) => {
  try {
    const body = req.body;

    if (!body.customer_name) {
      return res.status(400).json({ success: false, error: 'Customer name is required' });
    }

    const deal_id = body.deal_id || `DL-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
    const pentana_id = body.pentana_id || `PENTANA-${Math.floor(1000000 + Math.random() * 9000000)}`;

    const newLeadData = {
      deal_id,
      pentana_id,
      store_code: body.store_code || 'Store 70',
      dealership_name: body.dealership_name || 'South Morang Kia',
      dealer_code: body.dealer_code || 'BOORAN',
      customer_name: body.customer_name.trim(),
      customer_phone: body.customer_phone || body.phone || '',
      customer_email: body.customer_email || body.email || '',
      vehicle_make: body.vehicle_make || 'Kia',
      vehicle_model: body.vehicle_model || '',
      owner_name: body.owner_name || 'Unassigned',
      status: body.status || 'following_up',
      source: body.source || 'manual',
      created_at: body.created_at || new Date().toISOString(),
      minutes_to_first_contact: typeof body.minutes_to_first_contact === 'number' ? body.minutes_to_first_contact : null,
      follow_ups_sent: body.follow_ups_sent || 0,
      ai_status: body.ai_status || 'active',
      ai_schedule_preference: body.ai_schedule_preference || 'after_hours',
      ai_queued_messages: body.ai_queued_messages || [
        { id: 1, type: 'sms', content: 'Hi, are you still interested?', scheduled_for: new Date(Date.now() + 86400000).toISOString(), editable: true }
      ],
      diary_entries: body.diary_entries || [
        { date: new Date().toISOString(), user: body.created_by || 'Sales Staff', note: 'Lead created via Boran CRM.' }
      ],
      test_drive: body.test_drive || { status: 'none', licence_captured: false },
      trade_in: body.trade_in || { status: 'none', value: null },
      loan_car: body.loan_car || { status: 'none' },
      post_sales_followup: body.post_sales_followup || { status: 'n/a', next_contact: null },
      videos_sent: body.videos_sent || []
    };

    const lead = new Lead(newLeadData);
    await lead.save();

    return res.status(201).json({
      success: true,
      message: 'Lead created successfully in database',
      data: lead
    });
  } catch (error) {
    console.error('Error in createLead:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc Update an existing lead
 * @route PUT /api/leads/:id
 */
exports.updateLead = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    delete updateData._id;

    let lead = null;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      lead = await Lead.findByIdAndUpdate(id, { $set: updateData }, { returnDocument: 'after', runValidators: true });
    }
    if (!lead) {
      lead = await Lead.findOneAndUpdate({ deal_id: id }, { $set: updateData }, { returnDocument: 'after', runValidators: true });
    }

    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    return res.json({
      success: true,
      message: 'Lead updated successfully',
      data: lead
    });
  } catch (error) {
    console.error('Error in updateLead:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc Delete a lead
 * @route DELETE /api/leads/:id
 */
exports.deleteLead = async (req, res) => {
  try {
    const { id } = req.params;
    let result = null;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      result = await Lead.findByIdAndDelete(id);
    }
    if (!result) {
      result = await Lead.findOneAndDelete({ deal_id: id });
    }

    if (!result) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    return res.json({
      success: true,
      message: `Lead ${id} deleted successfully from database`
    });
  } catch (error) {
    console.error('Error in deleteLead:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc Toggle AI Auto-Followup Status
 * @route PATCH /api/leads/:id/ai-status
 */
exports.toggleAiStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { ai_status, user = 'Sales Staff' } = req.body;

    if (!['active', 'off'].includes(ai_status)) {
      return res.status(400).json({ success: false, error: 'ai_status must be "active" or "off"' });
    }

    const note = ai_status === 'off'
      ? 'AI Auto Follow-Up turned OFF by sales staff (direct contact in progress).'
      : 'AI Auto Follow-Up turned ON by sales staff (cadence resumed).';

    const newDiaryEntry = {
      date: new Date().toISOString(),
      user,
      note
    };

    let query = { deal_id: id };
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      query = { $or: [{ _id: id }, { deal_id: id }] };
    }

    const lead = await Lead.findOneAndUpdate(
      query,
      {
        $set: { ai_status },
        $push: { diary_entries: { $each: [newDiaryEntry], $position: 0 } }
      },
      { returnDocument: 'after' }
    );

    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    return res.json({ success: true, message: `AI status updated to ${ai_status}`, data: lead });
  } catch (error) {
    console.error('Error in toggleAiStatus:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc Add a diary note to a lead
 * @route POST /api/leads/:id/diary
 */
exports.addDiaryEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const { note, user = 'Sales Staff' } = req.body;

    if (!note || !note.trim()) {
      return res.status(400).json({ success: false, error: 'Diary note cannot be empty' });
    }

    const newEntry = {
      date: new Date().toISOString(),
      user: user.trim(),
      note: note.trim()
    };

    let query = { deal_id: id };
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      query = { $or: [{ _id: id }, { deal_id: id }] };
    }

    const lead = await Lead.findOneAndUpdate(
      query,
      {
        $push: { diary_entries: { $each: [newEntry], $position: 0 } }
      },
      { returnDocument: 'after' }
    );

    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    return res.status(201).json({
      success: true,
      message: 'Diary entry added',
      data: lead
    });
  } catch (error) {
    console.error('Error in addDiaryEntry:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc Update or cancel queued message
 * @route PUT /api/leads/:id/queued-messages/:msgId
 */
exports.updateQueuedMessage = async (req, res) => {
  try {
    const { id, msgId } = req.params;
    const { content, is_cancelled } = req.body;

    let query = { deal_id: id };
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      query = { $or: [{ _id: id }, { deal_id: id }] };
    }

    const lead = await Lead.findOne(query);
    if (!lead) {
      return res.status(404).json({ success: false, error: 'Lead not found' });
    }

    if (is_cancelled) {
      lead.ai_queued_messages = lead.ai_queued_messages.filter(m => String(m.id) !== String(msgId));
    } else {
      const msg = lead.ai_queued_messages.find(m => String(m.id) === String(msgId));
      if (msg) {
        msg.content = content;
      }
    }

    await lead.save();
    return res.json({ success: true, message: 'Queued message updated', data: lead });
  } catch (error) {
    console.error('Error in updateQueuedMessage:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
