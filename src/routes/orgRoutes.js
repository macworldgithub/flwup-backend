const express = require('express');
const router = express.Router();
const orgController = require('../controllers/orgController');

/**
 * @swagger
 * /api/organization:
 *   get:
 *     summary: Retrieve organization settings, current user, and color theme
 *     tags: [Organization]
 *     responses:
 *       200:
 *         description: Organization details
 */
router.get('/', orgController.getOrganization);

/**
 * @swagger
 * /api/organization:
 *   put:
 *     summary: Update organization settings
 *     tags: [Organization]
 *     responses:
 *       200:
 *         description: Organization updated
 */
router.put('/', orgController.updateOrganization);

module.exports = router;
