import { Router } from 'express';
import { SourceController } from '../controllers/source.controller';
import { upload } from '../middleware/upload.middleware';

const router = Router();

// Upload source
router.post('/upload', upload.single('document'), SourceController.uploadSource);

// Get all sources
router.get('/', SourceController.getAllSources);

// Get source by ID
router.get('/:id', SourceController.getSourceById);

export default router;

