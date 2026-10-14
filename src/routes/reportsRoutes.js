const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reportsController');

/**
 * @swagger
 * /api/reports:
 *   get:
 *     summary: Get all report presets data (CRUD - Read)
 *     tags: [Reports]
 *     responses:
 *       200:
 *         description: Map of report presets
 */
router.get('/', reportsController.getAllReports);

/**
 * @swagger
 * /api/reports/catalog/all:
 *   get:
 *     summary: Get reports catalog and available metrics definition
 *     tags: [Reports]
 *     responses:
 *       200:
 *         description: Catalog details
 */
router.get('/catalog/all', reportsController.getCatalog);

/**
 * @swagger
 * /api/reports/catalog/all:
 *   post:
 *     summary: Update reports catalog configuration
 *     tags: [Reports]
 *     responses:
 *       200:
 *         description: Catalog updated
 */
router.post('/catalog/all', reportsController.saveCatalog);

/**
 * @swagger
 * /api/reports/{preset}:
 *   get:
 *     summary: Get specific report preset by key (e.g. network_scoreboard, contact_coverage, speed_to_lead)
 *     tags: [Reports]
 *     parameters:
 *       - in: path
 *         name: preset
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Preset report data
 *       404:
 *         description: Preset not found
 */
router.get('/:preset', reportsController.getReportPreset);

/**
 * @swagger
 * /api/reports/{preset}:
 *   post:
 *     summary: Save or update report preset data (CRUD - Create/Update)
 *     tags: [Reports]
 *     parameters:
 *       - in: path
 *         name: preset
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Preset saved
 */
router.post('/:preset', reportsController.saveReportPreset);

/**
 * @swagger
 * /api/reports/{preset}:
 *   delete:
 *     summary: Delete a report preset (CRUD - Delete)
 *     tags: [Reports]
 *     parameters:
 *       - in: path
 *         name: preset
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Preset deleted
 */
router.delete('/:preset', reportsController.deleteReportPreset);

module.exports = router;
