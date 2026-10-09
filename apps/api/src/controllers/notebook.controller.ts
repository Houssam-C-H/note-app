import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { z } from 'zod';

const createNotebookSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, 'Title is required').max(200),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
  icon: z.string().max(50).optional(),
});

const updateNotebookSchema = createNotebookSchema.partial().extend({
  isArchived: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

const reorderSchema = z.object({
  orderedIds: z.array(z.string().uuid()),
});

export const reorderNotebooks = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { orderedIds } = reorderSchema.parse(req.body);

    // Update all sortOrders in a transaction
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.notebook.update({
          where: { id, userId },
          data: { sortOrder: index },
        })
      )
    );

    res.json({ message: 'Notebooks reordered successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Error reordering notebooks:', error);
    res.status(500).json({ error: 'Failed to reorder notebooks' });
  }
};

export const getNotebooks = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const notebooks = await prisma.notebook.findMany({
      where: { userId, isArchived: false, deletedAt: null },
      orderBy: { sortOrder: 'asc' },
      include: {
        sections: {
          where: { deletedAt: null },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    res.json(notebooks);
  } catch (error) {
    console.error('Error fetching notebooks:', error);
    res.status(500).json({ error: 'Failed to fetch notebooks' });
  }
};

export const createNotebook = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const validatedData = createNotebookSchema.parse(req.body);

    const maxSort = await prisma.notebook.aggregate({
      where: { userId },
      _max: { sortOrder: true },
    });
    const nextSortOrder = (maxSort._max.sortOrder ?? -1) + 1;

    const nbId = validatedData.id;
    let notebook;

    if (nbId) {
      notebook = await prisma.notebook.upsert({
        where: { id: nbId },
        update: {
          title: validatedData.title,
          color: validatedData.color,
          icon: validatedData.icon,
        },
        create: {
          id: nbId,
          title: validatedData.title,
          color: validatedData.color,
          icon: validatedData.icon,
          userId,
          sortOrder: nextSortOrder,
        },
        include: { sections: true },
      });
    } else {
      notebook = await prisma.notebook.create({
        data: {
          ...validatedData,
          userId,
          sortOrder: nextSortOrder,
        },
        include: { sections: true },
      });
    }

    res.status(201).json(notebook);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Error creating notebook:', error);
    res.status(500).json({ error: 'Failed to create notebook' });
  }
};

export const updateNotebook = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const validatedData = updateNotebookSchema.parse(req.body);

    // Ensure the notebook belongs to the user
    const notebook = await prisma.notebook.findFirst({ where: { id, userId } });
    if (!notebook) {
      return res.status(404).json({ error: 'Notebook not found' });
    }

    const updated = await prisma.notebook.update({
      where: { id },
      data: validatedData,
      include: { sections: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } } },
    });

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Error updating notebook:', error);
    res.status(500).json({ error: 'Failed to update notebook' });
  }
};

export const deleteNotebook = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const notebook = await prisma.notebook.findFirst({ where: { id, userId } });
    if (!notebook) {
      return res.status(404).json({ error: 'Notebook not found' });
    }

    // Soft delete notebook
    await prisma.notebook.update({
      where: { id },
      data: { deletedAt: new Date(), isArchived: true },
    });

    // Also soft delete all notes in this notebook
    const sections = await prisma.section.findMany({ where: { notebookId: id } });
    const sectionIds = sections.map(s => s.id);
    if (sectionIds.length > 0) {
      await prisma.note.updateMany({
        where: { sectionId: { in: sectionIds } },
        data: { deletedAt: new Date(), isArchived: true }
      });
    }

    res.json({ message: 'Notebook deleted successfully' });
  } catch (error) {
    console.error('Error deleting notebook:', error);
    res.status(500).json({ error: 'Failed to delete notebook' });
  }
};

export const getTrashedNotebooks = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const notebooks = await prisma.notebook.findMany({
      where: {
        userId,
        OR: [
          { deletedAt: { not: null } },
          { isArchived: true }
        ]
      },
      orderBy: { deletedAt: 'desc' },
      include: { sections: true }
    });
    res.json(notebooks);
  } catch (error) {
    console.error('Error fetching trashed notebooks:', error);
    res.status(500).json({ error: 'Failed to fetch trashed notebooks' });
  }
};

export const restoreNotebook = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const notebook = await prisma.notebook.findFirst({ where: { id, userId } });
    if (!notebook) {
      return res.status(404).json({ error: 'Notebook not found' });
    }
    const updated = await prisma.notebook.update({
      where: { id },
      data: { deletedAt: null, isArchived: false }
    });
    res.json(updated);
  } catch (error) {
    console.error('Error restoring notebook:', error);
    res.status(500).json({ error: 'Failed to restore notebook' });
  }
};

export const permanentDeleteNotebook = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const notebook = await prisma.notebook.findFirst({ where: { id, userId } });
    if (!notebook) {
      return res.status(404).json({ error: 'Notebook not found' });
    }
    await prisma.notebook.delete({ where: { id } });
    res.json({ message: 'Notebook permanently deleted' });
  } catch (error) {
    console.error('Error permanently deleting notebook:', error);
    res.status(500).json({ error: 'Failed to permanently delete notebook' });
  }
};
