import { Router } from 'express';
import { SourceController } from '../controllers/source.controller';
import { upload } from '../middleware/upload.middleware';

const router = Router();

// Upload source (file)
router.post('/upload', upload.single('document'), SourceController.uploadFileSource);

// Upload source (URL)
router.post('/upload-url', SourceController.uploadUrlSource);

// Get all sources
router.get('/', SourceController.getAllSources);

// Get source by ID
router.get('/:id', SourceController.getSourceById);

export default router;

