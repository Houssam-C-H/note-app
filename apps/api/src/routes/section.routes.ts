import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { createSection, updateSection, deleteSection, reorderSections } from '../controllers/section.controller';
import noteRoutes from './note.routes';

const router = Router({ mergeParams: true }); // mergeParams to access :notebookId from parent router

router.use(requireAuth);

router.post('/', createSection);
router.post('/reorder', reorderSections);
router.patch('/:sectionId', updateSection);
router.delete('/:sectionId', deleteSection);

router.use('/:sectionId/notes', noteRoutes);

export default router;
