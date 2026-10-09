import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { 
  getNotebooks, 
  createNotebook, 
  updateNotebook, 
  deleteNotebook, 
  reorderNotebooks,
  getTrashedNotebooks,
  restoreNotebook,
  permanentDeleteNotebook
} from '../controllers/notebook.controller';
import sectionRoutes from './section.routes';

const router = Router();

router.use(requireAuth);

router.get('/trash', getTrashedNotebooks);
router.post('/trash/:id/restore', restoreNotebook);
router.delete('/trash/:id', permanentDeleteNotebook);

router.get('/', getNotebooks);
router.post('/', createNotebook);
router.post('/reorder', reorderNotebooks);
router.patch('/:id', updateNotebook);
router.delete('/:id', deleteNotebook);

router.use('/:notebookId/sections', sectionRoutes);

export default router;
