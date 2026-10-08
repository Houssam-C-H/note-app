import * as argon2 from 'argon2';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(2),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export class AuthService {
  static async register(data: z.infer<typeof registerSchema>) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new Error('Email already registered');
    }

    const passwordHash = await argon2.hash(data.password);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        displayName: data.displayName,
      },
    });

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Send verification email asynchronously
    AuthService.sendVerificationEmail(user.id).catch(console.error);

    return { user, accessToken, refreshToken };
  }

  static async login(data: z.infer<typeof loginSchema>) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    const validPassword = await argon2.verify(user.passwordHash, data.password);

    if (!validPassword) {
      throw new Error('Invalid credentials');
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return { user, accessToken, refreshToken };
  }

  static async logout(refreshToken: string) {
    if (refreshToken) {
      await prisma.session.deleteMany({
        where: { refreshToken },
      });
    }
  }

  static async refreshSession(oldRefreshToken: string) {
    const session = await prisma.session.findFirst({
      where: { refreshToken: oldRefreshToken, expiresAt: { gt: new Date() } },
    });

    if (!session) {
      throw new Error('Invalid or expired refresh token');
    }

    const accessToken = generateAccessToken(session.userId);
    const refreshToken = generateRefreshToken(session.userId);

    await prisma.session.update({
      where: { id: session.id },
      data: {
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken };
  }

  static async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, displayName: true, emailVerified: true }
    });
    
    if (!user) throw new Error('User not found');
    return user;
  }

  static async requestPasswordReset(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return; // Silent return for security

    const { randomBytes, createHash } = await import('crypto');
    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');

    await prisma.passwordReset.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    const { EmailService } = await import('./email.service');
    await EmailService.sendPasswordReset(user.email, token);
  }

  static async resetPassword(token: string, newPassword: string) {
    const { createHash } = await import('crypto');
    const tokenHash = createHash('sha256').update(token).digest('hex');

    const resetRecord = await prisma.passwordReset.findFirst({
      where: { tokenHash, used: false, expiresAt: { gt: new Date() } },
    });

    if (!resetRecord) throw new Error('Invalid or expired reset token');

    const passwordHash = await argon2.hash(newPassword);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash },
      }),
      prisma.passwordReset.update({
        where: { id: resetRecord.id },
        data: { used: true },
      }),
      // Invalidate all existing sessions
      prisma.session.deleteMany({
        where: { userId: resetRecord.userId },
      }),
    ]);
  }

  static async sendVerificationEmail(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.emailVerified) return;

    const { randomBytes, createHash } = await import('crypto');
    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');

    await prisma.emailVerification.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    const { EmailService } = await import('./email.service');
    await EmailService.sendVerificationEmail(user.email, token);
  }

  static async verifyEmail(token: string) {
    const { createHash } = await import('crypto');
    const tokenHash = createHash('sha256').update(token).digest('hex');

    const verificationRecord = await prisma.emailVerification.findFirst({
      where: { tokenHash, used: false, expiresAt: { gt: new Date() } },
    });

    if (!verificationRecord) throw new Error('Invalid or expired verification token');

    await prisma.$transaction([
      prisma.user.update({
        where: { id: verificationRecord.userId },
        data: { emailVerified: true },
      }),
      prisma.emailVerification.update({
        where: { id: verificationRecord.id },
        data: { used: true },
      }),
    ]);
  }
}
