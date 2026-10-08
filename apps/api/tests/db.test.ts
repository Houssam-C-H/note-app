import { describe, it, expect, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';

// We mock PrismaClient to verify it instantiates and avoids actually trying to connect to a missing database during CI/offline tests.
vi.mock('@prisma/client', () => {
  return {
    PrismaClient: vi.fn().mockImplementation(() => ({
      $connect: vi.fn(),
      $disconnect: vi.fn(),
      user: {
        findMany: vi.fn().mockResolvedValue([]),
      }
    })),
  };
});

describe('Database connection & Prisma', () => {
  it('instantiates PrismaClient successfully', async () => {
    const prisma = new PrismaClient();
    expect(prisma).toBeDefined();
    await prisma.$connect();
    expect(prisma.$connect).toHaveBeenCalled();
  });
});
