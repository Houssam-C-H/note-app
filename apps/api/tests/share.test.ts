import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import app from '../src/app';
import { prisma } from '../src/lib/prisma';

describe('Share API & Authorization Boundaries', () => {
  const userA = {
    email: 'share_owner@example.com',
    password: 'password123',
    displayName: 'Share Owner',
  };

  const userB = {
    email: 'share_collab@example.com',
    password: 'password123',
    displayName: 'Share Collab',
  };

  let csrfCookie = '';
  let csrfToken = '';
  let tokenA = '';
  let tokenB = '';
  let userBId = '';
  let noteId = '';

  beforeAll(async () => {
    // Clean up any existing test records
    await prisma.user.deleteMany({
      where: { email: { in: [userA.email, userB.email] } },
    });

    // Obtain CSRF token
    const resCsrf = await request(app).get('/api/csrf-token');
    csrfToken = resCsrf.body.csrfToken;
    csrfCookie = resCsrf.headers['set-cookie'][0].split(';')[0];

    // Register User A (Owner)
    const regA = await request(app)
      .post('/api/auth/register')
      .set('Cookie', csrfCookie)
      .set('x-csrf-token', csrfToken)
      .send(userA);
    tokenA = regA.body.accessToken;

    // Register User B (Collaborator)
    const regB = await request(app)
      .post('/api/auth/register')
      .set('Cookie', csrfCookie)
      .set('x-csrf-token', csrfToken)
      .send(userB);
    tokenB = regB.body.accessToken;
    userBId = regB.body.user.id;

    // User A creates Notebook
    const nbRes = await request(app)
      .post('/api/notebooks')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('Cookie', csrfCookie)
      .set('x-csrf-token', csrfToken)
      .send({ title: 'Shared Space Notebook' });

    // User A creates Section
    const secRes = await request(app)
      .post(`/api/notebooks/${nbRes.body.id}/sections`)
      .set('Authorization', `Bearer ${tokenA}`)
      .set('Cookie', csrfCookie)
      .set('x-csrf-token', csrfToken)
      .send({ title: 'Shared Section' });

    // User A creates Note
    const noteRes = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${tokenA}`)
      .set('Cookie', csrfCookie)
      .set('x-csrf-token', csrfToken)
      .send({
        sectionId: secRes.body.id,
        title: 'Confidential Strategy Note',
        content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'V1 Content' }] }] },
        plaintext: 'V1 Content',
      });
    noteId = noteRes.body.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [userA.email, userB.email] } },
    });
  });

  it('initially denies User B from reading User A private note', async () => {
    const res = await request(app)
      .get(`/api/notes/${noteId}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect([403, 404]).toContain(res.status);
  });

  it('allows User A to share note with User B with READ permission', async () => {
    const res = await request(app)
      .post(`/api/shares/notes/${noteId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .set('Cookie', csrfCookie)
      .set('x-csrf-token', csrfToken)
      .send({
        email: userB.email,
        permission: 'READ',
      });

    expect(res.status).toBe(200);
    expect(res.body.permission).toBe('READ');
  });

  it('allows User B to see the shared note in their shared list', async () => {
    const res = await request(app)
      .get('/api/shares/me')
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(200);
    const sharedItem = res.body.notes?.find((s: any) => s.noteId === noteId || s.note?.id === noteId);
    expect(sharedItem).toBeDefined();
    expect(sharedItem.note.title).toBe('Confidential Strategy Note');
  });

  it('allows User B to read the note but rejects update when permission is READ', async () => {
    // Can read
    const readRes = await request(app)
      .get(`/api/notes/${noteId}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(readRes.status).toBe(200);
    expect(readRes.body.title).toBe('Confidential Strategy Note');

    // Cannot update
    const updateRes = await request(app)
      .patch(`/api/notes/${noteId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .set('Cookie', csrfCookie)
      .set('x-csrf-token', csrfToken)
      .send({ title: 'Hacked Title' });

    expect([403, 404]).toContain(updateRes.status);
  });

  it('allows User A to upgrade User B permission to EDIT', async () => {
    const res = await request(app)
      .post(`/api/shares/notes/${noteId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .set('Cookie', csrfCookie)
      .set('x-csrf-token', csrfToken)
      .send({
        email: userB.email,
        permission: 'EDIT',
      });

    expect(res.status).toBe(200);
    expect(res.body.permission).toBe('EDIT');
  });

  it('allows User B to update the note now that permission is EDIT', async () => {
    const updateRes = await request(app)
      .patch(`/api/notes/${noteId}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .set('Cookie', csrfCookie)
      .set('x-csrf-token', csrfToken)
      .send({ title: 'Updated Collaborative Strategy Note' });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.title).toBe('Updated Collaborative Strategy Note');
  });

  it('allows User A to revoke the share from User B', async () => {
    const revokeRes = await request(app)
      .delete(`/api/shares/notes/${noteId}/${userBId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .set('Cookie', csrfCookie)
      .set('x-csrf-token', csrfToken);

    expect(revokeRes.status).toBe(200);

    // User B can no longer read the note
    const readRes = await request(app)
      .get(`/api/notes/${noteId}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect([403, 404]).toContain(readRes.status);
  });
});
