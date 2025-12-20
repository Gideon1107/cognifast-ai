import { Router } from 'express';
import { DocumentController } from '../controllers/document.controller';
import { upload } from '../middleware/upload.middleware';

const router = Router();

// Upload document
router.post('/upload', upload.single('document'), DocumentController.uploadDocument);

// Get all documents
router.get('/', DocumentController.getAllDocuments);

// Get document by ID
router.get('/:id', DocumentController.getDocumentById);

export default router;

