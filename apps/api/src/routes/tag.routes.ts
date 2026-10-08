import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { getTags, createTag, updateTag, deleteTag, addTagToNote, removeTagFromNote } from '../controllers/tag.controller';

const router = Router();

router.use(requireAuth);

router.get('/', getTags);
router.post('/', createTag);
router.patch('/:id', updateTag);
router.delete('/:id', deleteTag);

router.post('/notes/:noteId/:tagId', addTagToNote);
router.delete('/notes/:noteId/:tagId', removeTagFromNote);

export default router;
