import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/lib/prisma';

describe('Notebook and Section Endpoints', () => {
  const testUser = {
    email: 'notebook@example.com',
    password: 'password123',
    displayName: 'Notebook User',
  };

  let csrfCookie = '';
  let csrfToken = '';
  let accessToken = '';
  let notebookId = '';
  let sectionId = '';

  beforeAll(async () => {
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
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: testUser.email } });
    await prisma.$disconnect();
  });

  describe('Notebooks', () => {
    it('should create a new notebook', async () => {
      const response = await request(app)
        .post('/api/notebooks')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Cookie', csrfCookie)
        .set('x-csrf-token', csrfToken)
        .send({ title: 'My First Notebook' });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('title', 'My First Notebook');
      notebookId = response.body.id;
    });

    it('should list notebooks', async () => {
      const response = await request(app)
        .get('/api/notebooks')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].title).toBe('My First Notebook');
    });

    it('should update a notebook', async () => {
      const response = await request(app)
        .patch(`/api/notebooks/${notebookId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Cookie', csrfCookie)
        .set('x-csrf-token', csrfToken)
        .send({ title: 'Updated Notebook' });

      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Updated Notebook');
    });
  });

  describe('Sections', () => {
    it('should create a section in a notebook', async () => {
      const response = await request(app)
        .post(`/api/notebooks/${notebookId}/sections`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Cookie', csrfCookie)
        .set('x-csrf-token', csrfToken)
        .send({ title: 'My First Section' });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('title', 'My First Section');
      expect(response.body.notebookId).toBe(notebookId);
      sectionId = response.body.id;
    });

    it('should update a section', async () => {
      const response = await request(app)
        .patch(`/api/notebooks/${notebookId}/sections/${sectionId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Cookie', csrfCookie)
        .set('x-csrf-token', csrfToken)
        .send({ title: 'Updated Section' });

      expect(response.status).toBe(200);
      expect(response.body.title).toBe('Updated Section');
    });

    it('should list notebooks with sections included', async () => {
      const response = await request(app)
        .get('/api/notebooks')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body[0].sections).toBeDefined();
      expect(response.body[0].sections[0].title).toBe('Updated Section');
    });

    it('should soft delete a section', async () => {
      const response = await request(app)
        .delete(`/api/notebooks/${notebookId}/sections/${sectionId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Cookie', csrfCookie)
        .set('x-csrf-token', csrfToken);

      expect(response.status).toBe(200);

      const getResponse = await request(app)
        .get('/api/notebooks')
        .set('Authorization', `Bearer ${accessToken}`);
      
      expect(getResponse.body[0].sections.length).toBe(0);
    });
  });

  describe('Notebook Deletion', () => {
    it('should soft delete a notebook', async () => {
      const response = await request(app)
        .delete(`/api/notebooks/${notebookId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Cookie', csrfCookie)
        .set('x-csrf-token', csrfToken);

      expect(response.status).toBe(200);

      const getResponse = await request(app)
        .get('/api/notebooks')
        .set('Authorization', `Bearer ${accessToken}`);
      
      expect(getResponse.body.length).toBe(0);
    });
  });
});
