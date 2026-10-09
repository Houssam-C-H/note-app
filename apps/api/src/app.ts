import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.routes';
import notebookRoutes from './routes/notebook.routes';
import { csrfProtection, generateCsrfToken } from './middleware/csrf.middleware';

dotenv.config();

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: false,
}));
app.use(cors({
  origin: (origin, callback) => {
    const allowed = [process.env.FRONTEND_URL, 'http://localhost:5173', 'http://localhost:5174'];
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// CSRF Protection
app.get('/api/csrf-token', generateCsrfToken);
app.use(csrfProtection);

import searchRoutes from './routes/search.routes';
import tagRoutes from './routes/tag.routes';
import attachmentRoutes from './routes/attachment.routes';
import shareRoutes from './routes/share.routes';
import sectionRoutes from './routes/section.routes';
import noteRoutes from './routes/note.routes';

app.use('/api/auth', authRoutes);
app.use('/api/notebooks', notebookRoutes);
app.use('/api/sections', sectionRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/attachments', attachmentRoutes);
app.use('/api/shares', shareRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

export default app;
