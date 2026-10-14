const express = require('express');
const router = express.Router();
const leadsController = require('../controllers/leadsController');

/**
 * @swagger
 * /api/leads:
 *   get:
 *     summary: Retrieve leads with filtering, search, sorting, and pagination
 *     tags: [Leads]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Text search across customer name, deal ID, pentana ID, make, model, owner, etc.
 *       - in: query
 *         name: store
 *         schema:
 *           type: string
 *           enum: [all, 'Store 70', 'Store 40']
 *         description: Filter by Pentana store code
 *       - in: query
 *         name: aiStatus
 *         schema:
 *           type: string
 *           enum: [all, active, off]
 *         description: Filter by AI Auto Follow-Up status
 *       - in: query
 *         name: dealership
 *         schema:
 *           type: string
 *         description: Filter by dealership name
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by lead status (e.g. following_up, sold, lost)
 *       - in: query
 *         name: owner
 *         schema:
 *           type: string
 *         description: Filter by assigned sales representative
 *       - in: query
 *         name: make
 *         schema:
 *           type: string
 *         description: Filter by vehicle make
 *       - in: query
 *         name: speed
 *         schema:
 *           type: string
 *           enum: [all, fast, moderate, slow, untouched]
 *         description: Filter by SLA response speed
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: created_at
 *         description: Field to sort by
 *       - in: query
 *         name: sortDir
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort direction
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: string
 *           default: 25
 *         description: Page size (or 'all' for complete dataset)
 *     responses:
 *       200:
 *         description: List of leads retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 count: { type: integer, example: 25 }
 *                 total: { type: integer, example: 1601 }
 *                 page: { type: integer, example: 1 }
 *                 pageSize: { type: integer, example: 25 }
 *                 totalPages: { type: integer, example: 65 }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Lead'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericError'
 */
router.get('/', leadsController.getLeads);

/**
 * @swagger
 * /api/leads:
 *   post:
 *     summary: Create a new lead (CRUD - Create)
 *     tags: [Leads]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LeadCreateInput'
 *     responses:
 *       201:
 *         description: Lead created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: 'Lead created successfully in database' }
 *                 data:
 *                   $ref: '#/components/schemas/Lead'
 *       400:
 *         description: Validation failed (e.g. missing customer name)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericError'
 */
router.post('/', leadsController.createLead);

/**
 * @swagger
 * /api/leads/{id}:
 *   get:
 *     summary: Get single lead by ID or deal_id (CRUD - Read)
 *     tags: [Leads]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId or Deal ID (e.g. DL-...)
 *     responses:
 *       200:
 *         description: Lead details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   $ref: '#/components/schemas/Lead'
 *       404:
 *         description: Lead not found
 */
router.get('/:id', leadsController.getLeadById);

/**
 * @swagger
 * /api/leads/{id}:
 *   put:
 *     summary: Update an existing lead (CRUD - Update)
 *     tags: [Leads]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId or Deal ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LeadUpdateInput'
 *     responses:
 *       200:
 *         description: Lead updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 message: { type: string, example: 'Lead updated successfully' }
 *                 data:
 *                   $ref: '#/components/schemas/Lead'
 *       404:
 *         description: Lead not found
 */
router.put('/:id', leadsController.updateLead);

/**
 * @swagger
 * /api/leads/{id}:
 *   delete:
 *     summary: Delete a lead (CRUD - Delete)
 *     tags: [Leads]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId or Deal ID
 *     responses:
 *       200:
 *         description: Lead deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericSuccess'
 *       404:
 *         description: Lead not found
 */
router.delete('/:id', leadsController.deleteLead);

/**
 * @swagger
 * /api/leads/{id}/ai-status:
 *   patch:
 *     summary: Toggle AI auto follow-up status on or off
 *     tags: [Leads]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [ai_status]
 *             properties:
 *               ai_status:
 *                 type: string
 *                 enum: [active, off]
 *                 example: off
 *               user:
 *                 type: string
 *                 example: Megan Taylor
 *     responses:
 *       200:
 *         description: AI status updated and diary entry logged
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   $ref: '#/components/schemas/Lead'
 */
router.patch('/:id/ai-status', leadsController.toggleAiStatus);

/**
 * @swagger
 * /api/leads/{id}/diary:
 *   post:
 *     summary: Add a new diary note to a lead
 *     tags: [Leads]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [note]
 *             properties:
 *               note:
 *                 type: string
 *                 example: Discussed finance options for Kia EV6, waiting on payslips.
 *               user:
 *                 type: string
 *                 example: Sarah Jenkins
 *     responses:
 *       201:
 *         description: Diary entry created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean, example: true }
 *                 data:
 *                   $ref: '#/components/schemas/Lead'
 */
router.post('/:id/diary', leadsController.addDiaryEntry);

/**
 * @swagger
 * /api/leads/{id}/queued-messages/{msgId}:
 *   put:
 *     summary: Edit or cancel a scheduled AI message
 *     tags: [Leads]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: msgId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 example: Revised SMS text for customer
 *               is_cancelled:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: Queued message updated
 */
router.put('/:id/queued-messages/:msgId', leadsController.updateQueuedMessage);

module.exports = router;
