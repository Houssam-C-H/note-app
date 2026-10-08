import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { getNotes, createNote, updateNote, deleteNote, duplicateNote } from '../controllers/note.controller';

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.get('/', getNotes);
router.post('/', createNote);
router.post('/:noteId/duplicate', duplicateNote);
router.patch('/:noteId', updateNote);
router.delete('/:noteId', deleteNote);

export default router;
