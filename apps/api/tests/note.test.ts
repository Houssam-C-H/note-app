import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import app from '../src/app';
import { prisma } from '../src/lib/prisma';

describe('Note API', () => {
  const testUser = {
    email: 'note_test@example.com',
    password: 'password123',
    displayName: 'Note Test User',
  };

  let csrfCookie = '';
  let csrfToken = '';
  let accessToken = '';
  let notebookId = '';
  let sectionId = '';
  let noteId = '';

  beforeAll(async () => {
    // 1. Create a test user and get tokens
    await prisma.user.deleteMany({ where: { email: testUser.email } });
    
    const resCsrf = await request(app).get('/api/csrf-token');
    csrfToken = resCsrf.body.csrfToken;
    csrfCookie = resCsrf.headers['set-cookie'][0].split(';')[0];

    const registerRes = await request(app)
      .post('/api/auth/register')
      .set('Cookie', csrfCookie)
      .set('x-csrf-token', csrfToken)
      .send(testUser);

    accessToken = registerRes.body.accessToken;

    // 2. Create a notebook for the user
    const nbRes = await request(app)
      .post('/api/notebooks')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Cookie', csrfCookie)
      .set('x-csrf-token', csrfToken)
      .send({ title: 'Note Test Notebook' });
    notebookId = nbRes.body.id;

    // 3. Create a section in that notebook
    const secRes = await request(app)
      .post(`/api/notebooks/${notebookId}/sections`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Cookie', csrfCookie)
      .set('x-csrf-token', csrfToken)
      .send({ title: 'Note Test Section' });
    sectionId = secRes.body.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: 'note_test@example.com' } });
  });

  it('should create a new note', async () => {
    const response = await request(app)
      .post(`/api/notebooks/${notebookId}/sections/${sectionId}/notes`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Cookie', csrfCookie)
      .set('x-csrf-token', csrfToken)
      .send({
        title: 'My First Note',
        content: { type: 'doc', content: [] },
        plaintext: 'My First Note content',
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.title).toBe('My First Note');
    expect(response.body.sectionId).toBe(sectionId);
    
    noteId = response.body.id;
  });

  it('should get all notes in a section', async () => {
    const response = await request(app)
      .get(`/api/notebooks/${notebookId}/sections/${sectionId}/notes`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Cookie', csrfCookie)
      .set('x-csrf-token', csrfToken);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThanOrEqual(1);
    expect(response.body[0].id).toBe(noteId);
  });

  it('should update a note', async () => {
    const response = await request(app)
      .patch(`/api/notebooks/${notebookId}/sections/${sectionId}/notes/${noteId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Cookie', csrfCookie)
      .set('x-csrf-token', csrfToken)
      .send({
        title: 'Updated Note Title',
        isPinned: true
      });

    expect(response.status).toBe(200);
    expect(response.body.title).toBe('Updated Note Title');
    expect(response.body.isPinned).toBe(true);
  });

  it('should return 404 when updating a note in wrong section', async () => {
    const wrongSectionId = '123e4567-e89b-12d3-a456-426614174000';
    const response = await request(app)
      .patch(`/api/notebooks/${notebookId}/sections/${wrongSectionId}/notes/${noteId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Cookie', csrfCookie)
      .set('x-csrf-token', csrfToken)
      .send({ title: 'Hacked' });

    expect(response.status).toBe(404);
  });

  it('should soft delete a note', async () => {
    const response = await request(app)
      .delete(`/api/notebooks/${notebookId}/sections/${sectionId}/notes/${noteId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Cookie', csrfCookie)
      .set('x-csrf-token', csrfToken);

    expect(response.status).toBe(200);

    // Verify it is no longer returned in the list
    const getResponse = await request(app)
      .get(`/api/notebooks/${notebookId}/sections/${sectionId}/notes`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('Cookie', csrfCookie)
      .set('x-csrf-token', csrfToken);

    expect(getResponse.body.find((n: any) => n.id === noteId)).toBeUndefined();
  });
});
