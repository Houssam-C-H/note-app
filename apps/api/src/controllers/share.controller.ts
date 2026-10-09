import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

const shareSchema = z.object({
  email: z.string().email('Invalid email address'),
  permission: z.enum(['READ', 'EDIT']),
});

// NOTEBOOK SHARES

export const shareNotebook = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { notebookId } = req.params;
    const data = shareSchema.parse(req.body);

    const notebook = await prisma.notebook.findUnique({ where: { id: notebookId } });
    if (!notebook) return res.status(404).json({ error: 'Notebook not found' });
    if (notebook.userId !== userId) return res.status(403).json({ error: 'Forbidden' });

    const targetUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (!targetUser) return res.status(404).json({ error: 'User with this email not found' });
    if (targetUser.id === userId) return res.status(400).json({ error: 'Cannot share with yourself' });

    const share = await prisma.notebookShare.upsert({
      where: {
        notebookId_sharedWithId: {
          notebookId,
          sharedWithId: targetUser.id,
        },
      },
      update: {
        permission: data.permission,
      },
      create: {
        notebookId,
        ownerId: userId,
        sharedWithId: targetUser.id,
        permission: data.permission,
      },
      include: {
        sharedWith: {
          select: { id: true, email: true, displayName: true },
        },
      },
    });

    res.status(200).json(share);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Error sharing notebook:', error);
    res.status(500).json({ error: 'Failed to share notebook' });
  }
};

export const revokeNotebookShare = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { notebookId, sharedWithId } = req.params;

    const notebook = await prisma.notebook.findUnique({ where: { id: notebookId } });
    if (!notebook) return res.status(404).json({ error: 'Notebook not found' });
    if (notebook.userId !== userId) return res.status(403).json({ error: 'Forbidden' });

    await prisma.notebookShare.delete({
      where: {
        notebookId_sharedWithId: {
          notebookId,
          sharedWithId,
        },
      },
    });

    res.status(200).json({ message: 'Share revoked' });
  } catch (error) {
    console.error('Error revoking notebook share:', error);
    res.status(500).json({ error: 'Failed to revoke notebook share' });
  }
};

export const listNotebookShares = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { notebookId } = req.params;

    const notebook = await prisma.notebook.findUnique({
      where: { id: notebookId },
      include: {
        user: { select: { id: true, email: true, displayName: true } }
      }
    });
    if (!notebook) return res.status(404).json({ error: 'Notebook not found' });

    const isOwner = notebook.userId === userId;
    const hasShare = await prisma.notebookShare.findFirst({
      where: { notebookId, sharedWithId: userId }
    });

    if (!isOwner && !hasShare) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const shares = await prisma.notebookShare.findMany({
      where: { notebookId },
      include: {
        sharedWith: {
          select: { id: true, email: true, displayName: true },
        },
        owner: {
          select: { id: true, email: true, displayName: true },
        }
      },
    });

    res.status(200).json({
      owner: notebook.user,
      shares,
    });
  } catch (error) {
    console.error('Error listing notebook shares:', error);
    res.status(500).json({ error: 'Failed to list notebook shares' });
  }
};

// NOTE SHARES

export const shareNote = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { noteId } = req.params;
    const data = shareSchema.parse(req.body);

    const note = await prisma.note.findUnique({ where: { id: noteId } });
    if (!note) return res.status(404).json({ error: 'Note not found' });
    if (note.userId !== userId) return res.status(403).json({ error: 'Forbidden' });

    const targetUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (!targetUser) return res.status(404).json({ error: 'User with this email not found' });
    if (targetUser.id === userId) return res.status(400).json({ error: 'Cannot share with yourself' });

    const share = await prisma.noteShare.upsert({
      where: {
        noteId_sharedWithId: {
          noteId,
          sharedWithId: targetUser.id,
        },
      },
      update: {
        permission: data.permission,
      },
      create: {
        noteId,
        ownerId: userId,
        sharedWithId: targetUser.id,
        permission: data.permission,
      },
      include: {
        sharedWith: {
          select: { id: true, email: true, displayName: true },
        },
      },
    });

    res.status(200).json(share);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Error sharing note:', error);
    res.status(500).json({ error: 'Failed to share note' });
  }
};

export const revokeNoteShare = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { noteId, sharedWithId } = req.params;

    const note = await prisma.note.findUnique({ where: { id: noteId } });
    if (!note) return res.status(404).json({ error: 'Note not found' });
    if (note.userId !== userId && sharedWithId !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await prisma.noteShare.deleteMany({
      where: {
        noteId,
        sharedWithId,
      },
    });

    res.status(200).json({ message: 'Share revoked' });
  } catch (error) {
    console.error('Error revoking note share:', error);
    res.status(500).json({ error: 'Failed to revoke note share' });
  }
};

export const listNoteShares = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { noteId } = req.params;

    const note = await prisma.note.findUnique({
      where: { id: noteId },
      include: {
        author: {
          select: { id: true, email: true, displayName: true },
        },
      },
    });
    if (!note) return res.status(404).json({ error: 'Note not found' });

    const isOwner = note.userId === userId;
    const directShare = await prisma.noteShare.findFirst({
      where: { noteId, sharedWithId: userId },
    });
    const notebookShare = await prisma.notebookShare.findFirst({
      where: {
        notebook: { sections: { some: { id: note.sectionId } } },
        sharedWithId: userId,
      },
    });

    if (!isOwner && !directShare && !notebookShare) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const shares = await prisma.noteShare.findMany({
      where: { noteId },
      include: {
        sharedWith: {
          select: { id: true, email: true, displayName: true },
        },
        owner: {
          select: { id: true, email: true, displayName: true },
        },
      },
    });

    res.status(200).json({
      owner: note.author,
      shares,
    });
  } catch (error) {
    console.error('Error listing note shares:', error);
    res.status(500).json({ error: 'Failed to list note shares' });
  }
};

// SHARED WITH ME ENDPOINTS

export const getSharedWithMe = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const sharedNotebooks = await prisma.notebookShare.findMany({
      where: { sharedWithId: userId },
      include: {
        notebook: true,
        owner: { select: { id: true, email: true, displayName: true } }
      }
    });

    const sharedNotes = await prisma.noteShare.findMany({
      where: { sharedWithId: userId },
      include: {
        note: true,
        owner: { select: { id: true, email: true, displayName: true } }
      }
    });

    res.status(200).json({
      notebooks: sharedNotebooks,
      notes: sharedNotes,
    });
  } catch (error) {
    console.error('Error getting shared items:', error);
    res.status(500).json({ error: 'Failed to fetch shared items' });
  }
};
