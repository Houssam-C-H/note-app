import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import app from '../src/app';
import { prisma } from '../src/lib/prisma';

describe('Trash API (Soft Deletes, Restore & Permanent Deletion)', () => {
  const user = {
    email: 'trash_test@example.com',
    password: 'password123',
    displayName: 'Trash Test User',
  };

  let csrfCookie = '';
  let csrfToken = '';
  let token = '';
  let sectionId = '';
  let noteId = '';

  beforeAll(async () => {
    await prisma.user.deleteMany({ where: { email: user.email } });

    const resCsrf = await request(app).get('/api/csrf-token');
    csrfToken = resCsrf.body.csrfToken;
    csrfCookie = resCsrf.headers['set-cookie'][0].split(';')[0];

    const reg = await request(app)
      .post('/api/auth/register')
      .set('Cookie', csrfCookie)
      .set('x-csrf-token', csrfToken)
      .send(user);
    token = reg.body.accessToken;

    const nbRes = await request(app)
      .post('/api/notebooks')
      .set('Authorization', `Bearer ${token}`)
      .set('Cookie', csrfCookie)
      .set('x-csrf-token', csrfToken)
      .send({ title: 'Trash Lifecycle Notebook' });

    const secRes = await request(app)
      .post(`/api/notebooks/${nbRes.body.id}/sections`)
      .set('Authorization', `Bearer ${token}`)
      .set('Cookie', csrfCookie)
      .set('x-csrf-token', csrfToken)
      .send({ title: 'Trash Lifecycle Section' });
    sectionId = secRes.body.id;

    const noteRes = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${token}`)
      .set('Cookie', csrfCookie)
      .set('x-csrf-token', csrfToken)
      .send({
        sectionId,
        title: 'Note Destined For Trash',
      });
    noteId = noteRes.body.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: user.email } });
  });

  it('soft deletes a note and moves it to trash', async () => {
    const delRes = await request(app)
      .delete(`/api/notes/${noteId}`)
      .set('Authorization', `Bearer ${token}`)
      .set('Cookie', csrfCookie)
      .set('x-csrf-token', csrfToken);

    expect(delRes.status).toBe(200);

    // It should no longer appear in standard note list
    const listRes = await request(app)
      .get(`/api/sections/${sectionId}/notes`)
      .set('Authorization', `Bearer ${token}`);

    expect(listRes.body.some((n: any) => n.id === noteId)).toBe(false);
  });

  it('lists the note in trash endpoint', async () => {
    const trashRes = await request(app)
      .get('/api/notes/trash')
      .set('Authorization', `Bearer ${token}`);

    expect(trashRes.status).toBe(200);
    expect(Array.isArray(trashRes.body)).toBe(true);
    const foundInTrash = trashRes.body.find((n: any) => n.id === noteId);
    expect(foundInTrash).toBeDefined();
    expect(foundInTrash.title).toBe('Note Destined For Trash');
  });

  it('restores the note from trash', async () => {
    const restoreRes = await request(app)
      .post(`/api/notes/trash/${noteId}/restore`)
      .set('Authorization', `Bearer ${token}`)
      .set('Cookie', csrfCookie)
      .set('x-csrf-token', csrfToken);

    expect(restoreRes.status).toBe(200);

    // Should now appear back in active section notes
    const listRes = await request(app)
      .get(`/api/sections/${sectionId}/notes`)
      .set('Authorization', `Bearer ${token}`);

    expect(listRes.body.some((n: any) => n.id === noteId)).toBe(true);
  });

  it('permanently deletes a note from trash', async () => {
    // Delete again to send to trash
    await request(app)
      .delete(`/api/notes/${noteId}`)
      .set('Authorization', `Bearer ${token}`)
      .set('Cookie', csrfCookie)
      .set('x-csrf-token', csrfToken);

    // Hard delete
    const permRes = await request(app)
      .delete(`/api/notes/trash/${noteId}`)
      .set('Authorization', `Bearer ${token}`)
      .set('Cookie', csrfCookie)
      .set('x-csrf-token', csrfToken);

    expect(permRes.status).toBe(200);

    // Verify completely gone from database
    const dbNote = await prisma.note.findUnique({ where: { id: noteId } });
    expect(dbNote).toBeNull();
  });
});
