import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { z } from 'zod';

const createSectionSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, 'Title is required').max(200),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
});

const updateSectionSchema = createSectionSchema.partial().extend({
  sortOrder: z.number().optional(),
});

const reorderSchema = z.object({
  orderedIds: z.array(z.string().uuid()),
});

export const reorderSections = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { notebookId } = req.params;
    const { orderedIds } = reorderSchema.parse(req.body);

    // Verify notebook belongs to user
    const notebook = await prisma.notebook.findFirst({ where: { id: notebookId, userId } });
    if (!notebook) {
      return res.status(404).json({ error: 'Notebook not found' });
    }

    // Update all sortOrders in a transaction
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.section.update({
          where: { id, notebookId },
          data: { sortOrder: index },
        })
      )
    );

    res.json({ message: 'Sections reordered successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Error reordering sections:', error);
    res.status(500).json({ error: 'Failed to reorder sections' });
  }
};

export const createSection = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { notebookId } = req.params;
    const validatedData = createSectionSchema.parse(req.body);

    // Verify notebook belongs to user
    const notebook = await prisma.notebook.findFirst({ where: { id: notebookId, userId } });
    if (!notebook) {
      return res.status(404).json({ error: 'Notebook not found' });
    }

    const maxSort = await prisma.section.aggregate({
      where: { notebookId },
      _max: { sortOrder: true },
    });
    const nextSortOrder = (maxSort._max.sortOrder ?? -1) + 1;

    const secId = validatedData.id;
    let section;

    if (secId) {
      section = await prisma.section.upsert({
        where: { id: secId },
        update: {
          title: validatedData.title,
          color: validatedData.color,
        },
        create: {
          id: secId,
          title: validatedData.title,
          color: validatedData.color,
          notebookId,
          sortOrder: nextSortOrder,
        },
      });
    } else {
      section = await prisma.section.create({
        data: {
          ...validatedData,
          notebookId,
          sortOrder: nextSortOrder,
        },
      });
    }

    res.status(201).json(section);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Error creating section:', error);
    res.status(500).json({ error: 'Failed to create section' });
  }
};

export const updateSection = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { notebookId, sectionId } = req.params;
    const validatedData = updateSectionSchema.parse(req.body);

    // Verify notebook belongs to user
    const notebook = await prisma.notebook.findFirst({ where: { id: notebookId, userId } });
    if (!notebook) {
      return res.status(404).json({ error: 'Notebook not found' });
    }

    // Verify section belongs to notebook
    const section = await prisma.section.findFirst({ where: { id: sectionId, notebookId } });
    if (!section) {
      return res.status(404).json({ error: 'Section not found' });
    }

    const updated = await prisma.section.update({
      where: { id: sectionId },
      data: validatedData,
    });

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Error updating section:', error);
    res.status(500).json({ error: 'Failed to update section' });
  }
};

export const deleteSection = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { notebookId, sectionId } = req.params;

    // Verify notebook belongs to user
    const notebook = await prisma.notebook.findFirst({ where: { id: notebookId, userId } });
    if (!notebook) {
      return res.status(404).json({ error: 'Notebook not found' });
    }

    const section = await prisma.section.findFirst({ where: { id: sectionId, notebookId } });
    if (!section) {
      return res.status(404).json({ error: 'Section not found' });
    }

    // Soft delete
    await prisma.section.update({
      where: { id: sectionId },
      data: { deletedAt: new Date() },
    });

    res.json({ message: 'Section deleted successfully' });
  } catch (error) {
    console.error('Error deleting section:', error);
    res.status(500).json({ error: 'Failed to delete section' });
  }
};
