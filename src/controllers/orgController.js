const Organization = require('../models/Organization');

/**
 * @desc Get organization info, user profile, and theme
 * @route GET /api/organization
 */
exports.getOrganization = async (req, res) => {
  try {
    const org = await Organization.findOne({ org_id: 'default' }).lean();
    if (!org) {
      return res.json({
        success: true,
        data: {
          name: 'Boran Motors Group',
          short_name: 'Boran Motors',
          dealer_group_code: 'BOORAN-MOTORS-VIC',
          theme: {
            primary: '#C8102E',
            darkRed: '#A50D26',
            white: '#FFFFFF',
            lightGrey: '#F5F5F5',
            borderGrey: '#E5E7EB',
            textPrimary: '#1F2937',
            textSecondary: '#6B7280'
          },
          current_user: {
            name: 'Megan Taylor',
            role: 'Group Marketing & Operations',
            email: 'megant@booranmotors.com.au',
            avatar: 'MT',
            role_label: 'Group Marketing'
          }
        }
      });
    }

    return res.json({
      success: true,
      data: org
    });
  } catch (error) {
    console.error('Error in getOrganization:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * @desc Update organization info
 * @route PUT /api/organization
 */
exports.updateOrganization = async (req, res) => {
  try {
    const updateData = { ...req.body };
    delete updateData._id;

    const org = await Organization.findOneAndUpdate(
      { org_id: 'default' },
      { $set: updateData },
      { upsert: true, returnDocument: 'after' }
    );

    return res.json({
      success: true,
      message: 'Organization updated successfully',
      data: org
    });
  } catch (error) {
    console.error('Error in updateOrganization:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
