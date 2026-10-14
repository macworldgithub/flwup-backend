const Rooftop = require('../models/Rooftop');

/**
 * @desc Get all rooftops / dealerships
 * @route GET /api/rooftops
 */
exports.getAllRooftops = async (req, res) => {
  try {
    const rooftops = await Rooftop.find().sort({ name: 1 }).lean();
    return res.json({
      success: true,
      count: rooftops.length,
      data: rooftops
    });
  } catch (error) {
    console.error('Error in getAllRooftops:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc Get single rooftop by ID
 * @route GET /api/rooftops/:id
 */
exports.getRooftopById = async (req, res) => {
  try {
    const { id } = req.params;
    let rooftop = await Rooftop.findOne({ id }).lean();
    if (!rooftop && id.match(/^[0-9a-fA-F]{24}$/)) {
      rooftop = await Rooftop.findById(id).lean();
    }

    if (!rooftop) {
      return res.status(404).json({ success: false, error: 'Rooftop not found' });
    }

    return res.json({ success: true, data: rooftop });
  } catch (error) {
    console.error('Error in getRooftopById:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc Create new rooftop
 * @route POST /api/rooftops
 */
exports.createRooftop = async (req, res) => {
  try {
    const { name, id, dealer_code, tier, brand } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'Dealership name is required' });
    }

    const rooftopId = id || `roof-${Date.now().toString(36)}`;
    const rooftop = new Rooftop({
      id: rooftopId,
      name,
      dealer_code: dealer_code || 'BOORAN',
      tier: tier || 'standard',
      brand: brand || '',
      active: true,
      has_post_sale_template: true
    });

    await rooftop.save();
    return res.status(201).json({
      success: true,
      message: 'Rooftop created successfully',
      data: rooftop
    });
  } catch (error) {
    console.error('Error in createRooftop:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc Update rooftop
 * @route PUT /api/rooftops/:id
 */
exports.updateRooftop = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    delete updateData._id;

    let rooftop = await Rooftop.findOneAndUpdate(
      { id },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!rooftop && id.match(/^[0-9a-fA-F]{24}$/)) {
      rooftop = await Rooftop.findByIdAndUpdate(
        id,
        { $set: updateData },
        { returnDocument: 'after' }
      );
    }

    if (!rooftop) {
      return res.status(404).json({ success: false, error: 'Rooftop not found' });
    }

    return res.json({
      success: true,
      message: 'Rooftop updated successfully',
      data: rooftop
    });
  } catch (error) {
    console.error('Error in updateRooftop:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc Delete rooftop
 * @route DELETE /api/rooftops/:id
 */
exports.deleteRooftop = async (req, res) => {
  try {
    const { id } = req.params;
    let result = await Rooftop.findOneAndDelete({ id });
    if (!result && id.match(/^[0-9a-fA-F]{24}$/)) {
      result = await Rooftop.findByIdAndDelete(id);
    }

    if (!result) {
      return res.status(404).json({ success: false, error: 'Rooftop not found' });
    }

    return res.json({
      success: true,
      message: `Rooftop ${id} deleted successfully`
    });
  } catch (error) {
    console.error('Error in deleteRooftop:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
