import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  shareNotebook,
  revokeNotebookShare,
  listNotebookShares,
  shareNote,
  revokeNoteShare,
  listNoteShares,
  getSharedWithMe
} from '../controllers/share.controller';

const router = Router();

router.use(requireAuth);

router.get('/me', getSharedWithMe);

router.post('/notebooks/:notebookId', shareNotebook);
router.get('/notebooks/:notebookId', listNotebookShares);
router.delete('/notebooks/:notebookId/:sharedWithId', revokeNotebookShare);

router.post('/notes/:noteId', shareNote);
router.get('/notes/:noteId', listNoteShares);
router.delete('/notes/:noteId/:sharedWithId', revokeNoteShare);

export default router;
