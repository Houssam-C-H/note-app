import { Router } from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth.middleware';
import { 
  getNotes, 
  createNote, 
  updateNote, 
  deleteNote, 
  duplicateNote,
  getTrashedNotes,
  restoreNote,
  permanentDeleteNote,
  getNoteById,
  addNoteToMyFiles
} from '../controllers/note.controller';

const router = Router({ mergeParams: true });

// Allow opening a note by ID with optional authentication (for public/shared links)
router.get('/:noteId', optionalAuth, getNoteById);

router.use(requireAuth);

router.get('/trash', getTrashedNotes);
router.post('/trash/:noteId/restore', restoreNote);
router.delete('/trash/:noteId', permanentDeleteNote);

router.get('/', getNotes);
router.post('/', createNote);
router.post('/:noteId/duplicate', duplicateNote);
router.post('/:noteId/add-to-files', addNoteToMyFiles);
router.patch('/:noteId', updateNote);
router.delete('/:noteId', deleteNote);

export default router;
