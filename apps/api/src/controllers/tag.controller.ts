import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { z } from 'zod';

const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().max(7).optional().default('#10b981'),
});

const updateTagSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().max(7).optional(),
});

export const getTags = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const tags = await prisma.tag.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
    res.json(tags);
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
};

export const createTag = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const validatedData = createTagSchema.parse(req.body);

    // Check for existing tag
    const existing = await prisma.tag.findUnique({
      where: { userId_name: { userId, name: validatedData.name } },
    });

    if (existing) {
      return res.status(400).json({ error: 'Tag with this name already exists' });
    }

    const tag = await prisma.tag.create({
      data: {
        ...validatedData,
        userId,
      },
    });
    res.status(201).json(tag);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Error creating tag:', error);
    res.status(500).json({ error: 'Failed to create tag' });
  }
};

export const updateTag = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const validatedData = updateTagSchema.parse(req.body);

    const tag = await prisma.tag.findFirst({
      where: { id, userId },
    });

    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    if (validatedData.name && validatedData.name !== tag.name) {
      const existing = await prisma.tag.findUnique({
        where: { userId_name: { userId, name: validatedData.name } },
      });
      if (existing) {
        return res.status(400).json({ error: 'Tag with this name already exists' });
      }
    }

    const updated = await prisma.tag.update({
      where: { id },
      data: validatedData,
    });
    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Error updating tag:', error);
    res.status(500).json({ error: 'Failed to update tag' });
  }
};

export const deleteTag = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const tag = await prisma.tag.findFirst({
      where: { id, userId },
    });

    if (!tag) {
      return res.status(404).json({ error: 'Tag not found' });
    }

    await prisma.tag.delete({
      where: { id },
    });
    res.json({ message: 'Tag deleted successfully' });
  } catch (error) {
    console.error('Error deleting tag:', error);
    res.status(500).json({ error: 'Failed to delete tag' });
  }
};

export const addTagToNote = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { noteId, tagId } = req.params;

    const [note, tag] = await Promise.all([
      prisma.note.findFirst({ where: { id: noteId, userId } }),
      prisma.tag.findFirst({ where: { id: tagId, userId } })
    ]);

    if (!note || !tag) {
      return res.status(404).json({ error: 'Note or tag not found' });
    }

    const noteTag = await prisma.noteTag.upsert({
      where: {
        noteId_tagId: { noteId, tagId }
      },
      create: { noteId, tagId },
      update: {}
    });

    res.status(201).json(noteTag);
  } catch (error) {
    console.error('Error adding tag to note:', error);
    res.status(500).json({ error: 'Failed to add tag to note' });
  }
};

export const removeTagFromNote = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { noteId, tagId } = req.params;

    const note = await prisma.note.findFirst({ where: { id: noteId, userId } });
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    await prisma.noteTag.delete({
      where: {
        noteId_tagId: { noteId, tagId }
      }
    }).catch(() => {}); // ignore if doesn't exist

    res.json({ message: 'Tag removed from note' });
  } catch (error) {
    console.error('Error removing tag from note:', error);
    res.status(500).json({ error: 'Failed to remove tag from note' });
  }
};
