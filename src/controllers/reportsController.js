const Report = require('../models/Report');
const Catalog = require('../models/Catalog');

/**
 * @desc Get all report presets
 * @route GET /api/reports
 */
exports.getAllReports = async (req, res) => {
  try {
    const reports = await Report.find().lean();
    const reportsMap = {};
    reports.forEach(r => {
      reportsMap[r.preset] = r.data || r;
    });

    return res.json({
      success: true,
      count: reports.length,
      data: reportsMap
    });
  } catch (error) {
    console.error('Error in getAllReports:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc Get a single report preset by key
 * @route GET /api/reports/:preset
 */
exports.getReportPreset = async (req, res) => {
  try {
    const { preset } = req.params;
    const report = await Report.findOne({ preset }).lean();

    if (!report) {
      return res.status(404).json({ success: false, error: `Report preset '${preset}' not found` });
    }

    return res.json({
      success: true,
      preset,
      data: report.data
    });
  } catch (error) {
    console.error('Error in getReportPreset:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc Create or update a report preset
 * @route POST /api/reports/:preset
 */
exports.saveReportPreset = async (req, res) => {
  try {
    const { preset } = req.params;
    const { title, data } = req.body;

    const report = await Report.findOneAndUpdate(
      { preset },
      {
        preset,
        title: title || preset.replace(/_/g, ' '),
        data: data || req.body,
        updated_at: new Date()
      },
      { upsert: true, returnDocument: 'after' }
    );

    return res.status(200).json({
      success: true,
      message: `Report '${preset}' saved successfully`,
      data: report
    });
  } catch (error) {
    console.error('Error in saveReportPreset:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc Delete a report preset
 * @route DELETE /api/reports/:preset
 */
exports.deleteReportPreset = async (req, res) => {
  try {
    const { preset } = req.params;
    const result = await Report.findOneAndDelete({ preset });

    if (!result) {
      return res.status(404).json({ success: false, error: `Report '${preset}' not found` });
    }

    return res.json({
      success: true,
      message: `Report preset '${preset}' deleted successfully`
    });
  } catch (error) {
    console.error('Error in deleteReportPreset:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc Get reports catalog
 * @route GET /api/reports/catalog/all
 */
exports.getCatalog = async (req, res) => {
  try {
    const catalog = await Catalog.findOne({ catalog_id: 'default' }).lean();
    return res.json({
      success: true,
      data: catalog?.data || {}
    });
  } catch (error) {
    console.error('Error in getCatalog:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc Save or update reports catalog
 * @route POST /api/reports/catalog/all
 */
exports.saveCatalog = async (req, res) => {
  try {
    const catalog = await Catalog.findOneAndUpdate(
      { catalog_id: 'default' },
      { catalog_id: 'default', data: req.body },
      { upsert: true, returnDocument: 'after' }
    );

    return res.json({
      success: true,
      message: 'Catalog updated successfully',
      data: catalog.data
    });
  } catch (error) {
    console.error('Error in saveCatalog:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
