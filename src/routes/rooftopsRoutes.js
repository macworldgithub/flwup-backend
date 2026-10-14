const express = require('express');
const router = express.Router();
const rooftopsController = require('../controllers/rooftopsController');

/**
 * @swagger
 * /api/rooftops:
 *   get:
 *     summary: Get all dealership rooftops (CRUD - Read)
 *     tags: [Rooftops]
 *     responses:
 *       200:
 *         description: List of dealerships
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 count: { type: integer, example: 4 }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Rooftop'
 */
router.get('/', rooftopsController.getAllRooftops);

/**
 * @swagger
 * /api/rooftops:
 *   post:
 *     summary: Create a new dealership rooftop (CRUD - Create)
 *     tags: [Rooftops]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string, example: 'South Morang Nissan' }
 *               dealer_code: { type: string, example: 'BOORAN' }
 *               tier: { type: string, example: 'enterprise' }
 *               brand: { type: string, example: 'Nissan' }
 *     responses:
 *       201:
 *         description: Rooftop created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Rooftop'
 */
router.post('/', rooftopsController.createRooftop);

/**
 * @swagger
 * /api/rooftops/{id}:
 *   get:
 *     summary: Get rooftop by ID (CRUD - Read)
 *     tags: [Rooftops]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Rooftop found
 *       404:
 *         description: Rooftop not found
 */
router.get('/:id', rooftopsController.getRooftopById);

/**
 * @swagger
 * /api/rooftops/{id}:
 *   put:
 *     summary: Update rooftop details (CRUD - Update)
 *     tags: [Rooftops]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               tier: { type: string }
 *               active: { type: boolean }
 *     responses:
 *       200:
 *         description: Rooftop updated
 */
router.put('/:id', rooftopsController.updateRooftop);

/**
 * @swagger
 * /api/rooftops/{id}:
 *   delete:
 *     summary: Delete rooftop (CRUD - Delete)
 *     tags: [Rooftops]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Rooftop deleted
 */
router.delete('/:id', rooftopsController.deleteRooftop);

module.exports = router;
