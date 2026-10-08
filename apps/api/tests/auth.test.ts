import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/lib/prisma';

describe('Auth Endpoints', () => {
  const testUser = {
    email: 'test@example.com',
    password: 'password123',
    displayName: 'Test User',
  };

  let csrfCookie = '';
  let csrfToken = '';

  beforeAll(async () => {
    // Clean up test database before starting
    await prisma.user.deleteMany({ where: { email: testUser.email } });
    
    // Get CSRF token
    const res = await request(app).get('/api/csrf-token');
    csrfToken = res.body.csrfToken;
    csrfCookie = res.headers['set-cookie'][0].split(';')[0];
  });

  afterAll(async () => {
    // Clean up test database after tests
    await prisma.user.deleteMany({ where: { email: testUser.email } });
    await prisma.$disconnect();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .set('Cookie', csrfCookie)
        .set('x-csrf-token', csrfToken)
        .send(testUser);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message', 'Registration successful');
      expect(response.body.user).toHaveProperty('email', testUser.email);
      expect(response.body).toHaveProperty('accessToken');
      
      // Verify refresh token cookie is set
      const cookies = response.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      expect(cookies.some((c: string) => c.includes('refreshToken'))).toBe(true);
    });

    it('should fail when registering an existing email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .set('Cookie', csrfCookie)
        .set('x-csrf-token', csrfToken)
        .send(testUser);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Email already registered');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login an existing user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Cookie', csrfCookie)
        .set('x-csrf-token', csrfToken)
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.user).toHaveProperty('email', testUser.email);
      
      const cookies = response.headers['set-cookie'] as unknown as string[];
      expect(cookies).toBeDefined();
      expect(cookies.some((c: string) => c.includes('refreshToken'))).toBe(true);
    });

    it('should fail with invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Cookie', csrfCookie)
        .set('x-csrf-token', csrfToken)
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid credentials');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh access token using refresh token cookie', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .set('Cookie', csrfCookie)
        .set('x-csrf-token', csrfToken)
        .send({ email: testUser.email, password: testUser.password });
        
      const refreshCookie = (loginRes.headers['set-cookie'] as unknown as string[]).find((c: string) => c.startsWith('refreshToken='))!.split(';')[0];

      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', `${csrfCookie}; ${refreshCookie}`)
        .set('x-csrf-token', csrfToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should fail without refresh token cookie', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', csrfCookie)
        .set('x-csrf-token', csrfToken);
        
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should successfully logout and clear cookie', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .set('Cookie', csrfCookie)
        .set('x-csrf-token', csrfToken)
        .send({ email: testUser.email, password: testUser.password });
        
      const refreshCookie = (loginRes.headers['set-cookie'] as unknown as string[]).find((c: string) => c.startsWith('refreshToken='))!.split(';')[0];

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', `${csrfCookie}; ${refreshCookie}`)
        .set('x-csrf-token', csrfToken);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Logout successful');
      
      const logoutCookie = (response.headers['set-cookie'] as unknown as string[]).find((c: string) => c.startsWith('refreshToken='));
      expect(logoutCookie).toContain('refreshToken=;');
    });
  });
});

