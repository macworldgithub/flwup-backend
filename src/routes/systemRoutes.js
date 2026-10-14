const express = require('express');
const router = express.Router();
const systemController = require('../controllers/systemController');

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Check system and database health
 *     tags: [System]
 *     responses:
 *       200:
 *         description: System health status and MongoDB connection info
 */
router.get('/health', systemController.getHealth);

/**
 * @swagger
 * /api/system/migrate:
 *   post:
 *     summary: Trigger manual data migration from JSON files to MongoDB
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Migration completed
 */
router.post('/system/migrate', systemController.triggerMigration);

module.exports = router;
