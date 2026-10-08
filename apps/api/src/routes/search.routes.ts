import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { searchNotes } from '../controllers/note.controller';

const router = Router();

router.use(requireAuth);

router.get('/notes', searchNotes);

export default router;
