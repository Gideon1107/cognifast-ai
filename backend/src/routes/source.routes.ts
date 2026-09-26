import { Router } from 'express';
import { SourceController } from '../controllers/source.controller';
import { upload } from '../middleware/upload.middleware';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Sources
 *   description: API for managing documents and sources
 */

/**
 * @swagger
 * /api/sources/upload:
 *   post:
 *     summary: Upload a document file source
 *     tags: [Sources]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               document:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Document uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Source'
 */
router.post('/upload', upload.single('document'), SourceController.uploadFileSource);

/**
 * @swagger
 * /api/sources/upload-url:
 *   post:
 *     summary: Upload a URL source
 *     tags: [Sources]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *     responses:
 *       200:
 *         description: URL uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Source'
 */
router.post('/upload-url', SourceController.uploadUrlSource);

/**
 * @swagger
 * /api/sources:
 *   get:
 *     summary: Get all sources
 *     tags: [Sources]
 *     responses:
 *       200:
 *         description: A list of sources
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Source'
 */
router.get('/', SourceController.getAllSources);

/**
 * @swagger
 * /api/sources/{id}:
 *   get:
 *     summary: Get a source by ID
 *     tags: [Sources]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Source details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Source'
 */
router.get('/:id', SourceController.getSourceById);

export default router;

