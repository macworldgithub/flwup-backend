const express = require('express');
const router = express.Router();
const kpisController = require('../controllers/kpisController');

/**
 * @swagger
 * /api/kpis:
 *   get:
 *     summary: Retrieve real-time calculated KPIs from the database
 *     tags: [Metrics & KPIs]
 *     responses:
 *       200:
 *         description: Live calculated KPIs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   $ref: '#/components/schemas/KPIs'
 */
router.get('/', kpisController.getKpis);

/**
 * @swagger
 * /api/filters:
 *   get:
 *     summary: Retrieve distinct filter values dynamically from leads data
 *     tags: [Metrics & KPIs]
 *     responses:
 *       200:
 *         description: Distinct options for dropdown filters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   $ref: '#/components/schemas/FilterOptions'
 */
router.get('/filters', kpisController.getFilterOptions);

module.exports = router;
