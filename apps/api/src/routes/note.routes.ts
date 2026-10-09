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

// Specific static trash routes (must be before :noteId)
router.get('/trash', requireAuth, getTrashedNotes);
router.post('/trash/:noteId/restore', requireAuth, restoreNote);
router.delete('/trash/:noteId', requireAuth, permanentDeleteNote);

// Allow opening a note by ID with optional authentication (for public/shared links)
router.get('/:noteId', optionalAuth, getNoteById);

router.use(requireAuth);

router.get('/', getNotes);
router.post('/', createNote);
router.post('/:noteId/duplicate', duplicateNote);
router.post('/:noteId/add-to-files', addNoteToMyFiles);
router.patch('/:noteId', updateNote);
router.delete('/:noteId', deleteNote);

export default router;
