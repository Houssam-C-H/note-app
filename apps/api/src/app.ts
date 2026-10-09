import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.routes';
import notebookRoutes from './routes/notebook.routes';
import searchRoutes from './routes/search.routes';
import tagRoutes from './routes/tag.routes';
import attachmentRoutes from './routes/attachment.routes';
import shareRoutes from './routes/share.routes';
import sectionRoutes from './routes/section.routes';
import noteRoutes from './routes/note.routes';
import { csrfProtection, generateCsrfToken } from './middleware/csrf.middleware';

dotenv.config();

const app = express();

// 1. CORS Middleware FIRST to ensure all requests and error responses have CORS headers
const allowedOrigins = [
  process.env.APP_URL,
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:3000',
].filter(Boolean) as string[];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'x-csrf-token'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// 2. Security Headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// 3. Body and Cookie Parsers
app.use(express.json());
app.use(cookieParser());

// 4. Rate Limiter (Placed after CORS and skipping OPTIONS preflights)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 1000 : 50000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS',
});
app.use(limiter);

// 5. CSRF Protection
app.get('/api/csrf-token', generateCsrfToken);
app.use(csrfProtection);

// 6. Application Routes
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
