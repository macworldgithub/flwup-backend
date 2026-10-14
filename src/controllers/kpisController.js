const Lead = require('../models/Lead');

/**
 * @desc Get real-time KPI metrics aggregated directly from database
 * @route GET /api/kpis
 */
exports.getKpis = async (req, res) => {
  try {
    const totalLeads = await Lead.countDocuments();
    if (totalLeads === 0) {
      return res.json({
        success: true,
        data: {
          total_leads: 0,
          contact_coverage_rate: '0.0',
          touched_15m_rate: '0.0',
          median_minutes_to_contact: 0,
          reply_rate: '0.0',
          sold_count: 0,
          sold_rate: '0.0'
        }
      });
    }

    const contactedCount = await Lead.countDocuments({
      $or: [
        { first_contact_at: { $ne: null } },
        { minutes_to_first_contact: { $ne: null } }
      ]
    });

    const touched15mCount = await Lead.countDocuments({
      minutes_to_first_contact: { $ne: null, $lte: 15 }
    });

    const repliedCount = await Lead.countDocuments({
      first_reply_at: { $ne: null }
    });

    const soldCount = await Lead.countDocuments({
      $or: [
        { status: 'sold' },
        { sold_at: { $ne: null } }
      ]
    });

    // Compute median minutes to first contact
    const times = await Lead.find({
      minutes_to_first_contact: { $ne: null, $gte: 0 }
    })
      .select('minutes_to_first_contact')
      .sort({ minutes_to_first_contact: 1 })
      .lean();

    let medianMinutes = 0;
    if (times.length > 0) {
      const mid = Math.floor(times.length / 2);
      medianMinutes = times[mid].minutes_to_first_contact;
    }

    const kpis = {
      total_leads: totalLeads,
      contact_coverage_rate: ((contactedCount / totalLeads) * 100).toFixed(1),
      touched_15m_rate: ((touched15mCount / totalLeads) * 100).toFixed(1),
      median_minutes_to_contact: medianMinutes,
      reply_rate: ((repliedCount / totalLeads) * 100).toFixed(1),
      sold_count: soldCount,
      sold_rate: ((soldCount / totalLeads) * 100).toFixed(1)
    };

    return res.json({
      success: true,
      data: kpis
    });
  } catch (error) {
    console.error('Error in getKpis:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc Get dynamic filter dropdown values from database
 * @route GET /api/filters
 */
exports.getFilterOptions = async (req, res) => {
  try {
    const [dealerships, makes, owners, sources, stores] = await Promise.all([
      Lead.distinct('dealership_name', { dealership_name: { $ne: null } }),
      Lead.distinct('vehicle_make', { vehicle_make: { $ne: null } }),
      Lead.distinct('owner_name', { owner_name: { $ne: null } }),
      Lead.distinct('source', { source: { $ne: null } }),
      Lead.distinct('store_code', { store_code: { $ne: null } })
    ]);

    const sortFn = (a, b) => String(a).localeCompare(String(b));

    return res.json({
      success: true,
      data: {
        dealerships: dealerships.filter(Boolean).sort(sortFn),
        makes: makes.filter(Boolean).sort(sortFn),
        owners: owners.filter(Boolean).sort(sortFn),
        sources: sources.filter(Boolean).sort(sortFn),
        stores: stores.filter(Boolean).sort(sortFn)
      }
    });
  } catch (error) {
    console.error('Error in getFilterOptions:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
