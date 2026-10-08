import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { uploadMiddleware } from '../middleware/upload.middleware';
import { 
  uploadAttachment, 
  getAttachments, 
  downloadAttachment, 
  deleteAttachment 
} from '../controllers/attachment.controller';

const router = Router();

// Public endpoint for capability URLs (UUIDs are unguessable)
router.get('/:id/download', downloadAttachment);

router.use(requireAuth);

router.get('/notes/:noteId', getAttachments);
router.post(
  '/notes/:noteId', 
  (req, res, next) => {
    uploadMiddleware.single('file')(req, res, (err: any) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      next();
    });
  },
  uploadAttachment
);
router.delete('/:id', deleteAttachment);

export default router;
