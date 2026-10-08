import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import app from '../src/app';
import { prisma } from '../src/lib/prisma';
import path from 'path';
import fs from 'fs';

describe('Attachment API', () => {
  const testUser = {
    email: 'attachment_test@example.com',
    password: 'password123',
    displayName: 'Attachment Test',
  };

  let csrfCookie = '';
  let csrfToken = '';
  let accessToken = '';
  let notebookId = '';
  let sectionId = '';
  let noteId = '';
  let attachmentId = '';

  const testFilePath = path.join(__dirname, 'test_attachment.txt');

  beforeAll(async () => {
    // 1. Create a test user and get tokens
    await prisma.user.deleteMany({ where: { email: testUser.email } });
    
    fs.writeFileSync(testFilePath, 'Hello World Attachment Test!');

    const resCsrf = await request(app).get('/api/csrf-token');
    csrfToken = resCsrf.body.csrfToken;
    csrfCookie = resCsrf.headers['set-cookie'][0].split(';')[0];

    const resReg = await request(app)
      .post('/api/auth/register')
      .set('Cookie', csrfCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({ email: testUser.email, password: testUser.password, displayName: testUser.displayName });
      
    accessToken = resReg.body.accessToken;

    // 2. Setup Notebook, Section, Note
    const resNb = await request(app)
      .post('/api/notebooks')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Cookie', csrfCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({ title: 'Test Notebook' });
    if (!resNb.body.id) console.log('resNb:', resNb.body);
    notebookId = resNb.body.id;

    const resSec = await request(app)
      .post(`/api/notebooks/${notebookId}/sections`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Cookie', csrfCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({ title: 'Test Section' });
    if (!resSec.body.id) console.log('resSec:', resSec.body);
    sectionId = resSec.body.id;

    const resNote = await request(app)
      .post(`/api/notebooks/${notebookId}/sections/${sectionId}/notes`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Cookie', csrfCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({ title: 'Test Note', content: {} });
    if (!resNote.body.id) console.log('resNote:', resNote.body);
    noteId = resNote.body.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: testUser.email } });
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });

  it('should upload an attachment to a note', async () => {
    const res = await request(app)
      .post(`/api/attachments/notes/${noteId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Cookie', csrfCookie)
      .set('X-CSRF-Token', csrfToken)
      .attach('file', testFilePath);

    expect(res.status).toBe(201);
    expect(res.body.originalName).toBe('test_attachment.txt');
    attachmentId = res.body.id;
  });

  it('should list attachments for a note', async () => {
    const res = await request(app)
      .get(`/api/attachments/notes/${noteId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Cookie', csrfCookie)
      .set('X-CSRF-Token', csrfToken);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].id).toBe(attachmentId);
  });

  it('should download the attachment (Capability URL)', async () => {
    const res = await request(app)
      .get(`/api/attachments/${attachmentId}/download`)
      // No auth required for download!
      
    expect(res.status).toBe(200);
    expect(res.text).toBe('Hello World Attachment Test!');
  });

  it('should delete the attachment', async () => {
    const res = await request(app)
      .delete(`/api/attachments/${attachmentId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Cookie', csrfCookie)
      .set('X-CSRF-Token', csrfToken);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Attachment deleted successfully');

    // Verify it's gone
    const resGet = await request(app)
      .get(`/api/attachments/${attachmentId}/download`);
    expect(resGet.status).toBe(404);
  });
});
