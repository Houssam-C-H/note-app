import { Request, Response } from 'express';
import { AuthService, registerSchema, loginSchema } from '../services/auth.service';

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const data = registerSchema.parse(req.body);
      const { user, accessToken, refreshToken } = await AuthService.register(data);

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.status(201).json({
        message: 'Registration successful',
        user: { id: user.id, email: user.email, displayName: user.displayName },
        accessToken,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const data = loginSchema.parse(req.body);
      const { user, accessToken, refreshToken } = await AuthService.login(data);

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.json({
        message: 'Login successful',
        user: { id: user.id, email: user.email, displayName: user.displayName },
        accessToken,
      });
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  }

  static async logout(req: Request, res: Response) {
    try {
      const { refreshToken } = req.cookies;
      await AuthService.logout(refreshToken);
      
      res.clearCookie('refreshToken');
      res.json({ message: 'Logout successful' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async refresh(req: Request, res: Response) {
    try {
      const { refreshToken: oldRefreshToken } = req.cookies;
      if (!oldRefreshToken) {
        return res.status(401).json({ error: 'No refresh token provided' });
      }

      const { accessToken, refreshToken } = await AuthService.refreshSession(oldRefreshToken);

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.json({ accessToken });
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  }

  static async getCurrentUser(req: any, res: Response) {
    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      const user = await AuthService.getUserById(req.user.userId);
      res.json({ user });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async requestPasswordReset(req: Request, res: Response) {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      await AuthService.requestPasswordReset(email);
      res.json({ message: 'If an account exists, a reset link has been sent.' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async resetPassword(req: Request, res: Response) {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword) {
        return res.status(400).json({ error: 'Token and new password are required' });
      }
      if (newPassword.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long' });
      }

      await AuthService.resetPassword(token, newPassword);
      res.json({ message: 'Password has been reset successfully.' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  static async verifyEmail(req: Request, res: Response) {
    try {
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ error: 'Token is required' });
      }

      await AuthService.verifyEmail(token);
      res.json({ message: 'Email has been verified successfully.' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
