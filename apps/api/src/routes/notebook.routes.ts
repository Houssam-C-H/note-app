import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { getNotebooks, createNotebook, updateNotebook, deleteNotebook, reorderNotebooks } from '../controllers/notebook.controller';
import sectionRoutes from './section.routes';

const router = Router();

router.use(requireAuth);

router.get('/', getNotebooks);
router.post('/', createNotebook);
router.post('/reorder', reorderNotebooks);
router.patch('/:id', updateNotebook);
router.delete('/:id', deleteNotebook);

router.use('/:notebookId/sections', sectionRoutes);

export default router;
