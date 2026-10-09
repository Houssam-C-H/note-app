import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { z } from 'zod';

const createNoteSchema = z.object({
  id: z.string().uuid().optional(),
  sectionId: z.string().uuid().optional(),
  title: z.string().max(500).optional().default('Untitled'),
  content: z.record(z.any()).optional().default({}),
  plaintext: z.string().optional().default(''),
});

const updateNoteSchema = z.object({
  title: z.string().max(500).optional(),
  content: z.record(z.any()).optional(),
  plaintext: z.string().optional(),
  isPinned: z.boolean().optional(),
  isFavorite: z.boolean().optional(),
  sectionId: z.string().uuid().optional(),
});

export const getNotes = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { sectionId } = req.params;

    // Verify section belongs to user's notebook or user has READ access via share
    const section = await prisma.section.findFirst({
      where: { 
        id: sectionId,
        OR: [
          { notebook: { userId } },
          { notebook: { shares: { some: { sharedWithId: userId } } } }
        ]
      },
      include: { notebook: true }
    });

    if (!section) {
      return res.status(404).json({ error: 'Section not found or access denied' });
    }

    const notes = await prisma.note.findMany({
      where: { 
        sectionId,
        isArchived: false,
        deletedAt: null,
        OR: [
          { userId },
          { section: { notebook: { shares: { some: { sharedWithId: userId } } } } },
          { shares: { some: { sharedWithId: userId } } }
        ]
      },
      orderBy: [
        { isPinned: 'desc' },
        { sortOrder: 'asc' },
        { updatedAt: 'desc' }
      ],
      include: {
        tags: {
          include: { tag: true }
        }
      }
    });

    res.json(notes.map(n => ({
      ...n,
      tags: n.tags.map(nt => nt.tag)
    })));
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
};

export const createNote = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const validatedData = createNoteSchema.parse(req.body);
    const targetSectionId = req.params.sectionId || validatedData.sectionId;

    if (!targetSectionId) {
      return res.status(400).json({ error: 'sectionId is required' });
    }

    const section = await prisma.section.findFirst({
      where: { 
        id: targetSectionId,
        OR: [
          { notebook: { userId } },
          { notebook: { shares: { some: { sharedWithId: userId, permission: 'EDIT' } } } }
        ]
      },
      include: { notebook: true }
    });

    if (!section) {
      return res.status(404).json({ error: 'Section not found or insufficient permissions' });
    }

    const maxSort = await prisma.note.aggregate({
      where: { sectionId: targetSectionId },
      _max: { sortOrder: true },
    });
    const nextSortOrder = (maxSort._max.sortOrder ?? -1) + 1;

    const noteId = validatedData.id;
    let note;

    if (noteId) {
      note = await prisma.note.upsert({
        where: { id: noteId },
        update: {
          title: validatedData.title,
          content: validatedData.content,
          plaintext: validatedData.plaintext,
          sectionId: targetSectionId,
        },
        create: {
          id: noteId,
          title: validatedData.title,
          content: validatedData.content,
          plaintext: validatedData.plaintext,
          sectionId: targetSectionId,
          userId,
          sortOrder: nextSortOrder,
        },
      });
    } else {
      note = await prisma.note.create({
        data: {
          title: validatedData.title,
          content: validatedData.content,
          plaintext: validatedData.plaintext,
          sectionId: targetSectionId,
          userId,
          sortOrder: nextSortOrder,
        },
      });
    }

    res.status(201).json(note);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Error creating note:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
};

export const updateNote = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { sectionId, noteId } = req.params;
    const validatedData = updateNoteSchema.parse(req.body);

    const note = await prisma.note.findFirst({
      where: { 
        id: noteId,
        sectionId,
        OR: [
          { userId },
          { section: { notebook: { shares: { some: { sharedWithId: userId, permission: 'EDIT' } } } } },
          { shares: { some: { sharedWithId: userId, permission: 'EDIT' } } }
        ]
      },
    });

    if (!note) {
      return res.status(404).json({ error: 'Note not found or insufficient permissions' });
    }

    if (validatedData.sectionId && validatedData.sectionId !== note.sectionId) {
      const newSection = await prisma.section.findFirst({
        where: { id: validatedData.sectionId, notebook: { userId } },
      });
      if (!newSection) {
        return res.status(403).json({ error: 'Cannot move note to a section you do not own' });
      }
    }

    const updated = await prisma.note.update({
      where: { id: noteId },
      data: {
        ...validatedData,
        lastEditedAt: Object.keys(validatedData).some(k => ['title', 'content'].includes(k)) 
          ? new Date() 
          : undefined
      },
    });

    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors[0].message });
    }
    console.error('Error updating note:', error);
    res.status(500).json({ error: 'Failed to update note' });
  }
};

export const getNoteById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { noteId } = req.params;

    const note = await prisma.note.findFirst({
      where: {
        id: noteId,
        deletedAt: null,
      },
      include: {
        section: {
          include: { notebook: true }
        },
        tags: {
          include: { tag: true }
        }
      }
    });

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    res.json({
      ...note,
      tags: note.tags.map(nt => nt.tag)
    });
  } catch (error) {
    console.error('Error fetching note by id:', error);
    res.status(500).json({ error: 'Failed to fetch note' });
  }
};

export const deleteNote = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { sectionId, noteId } = req.params;

    const note = await prisma.note.findFirst({
      where: { 
        id: noteId,
        ...(sectionId ? { sectionId } : {}),
        OR: [
          { userId },
          { section: { notebook: { userId } } },
          { section: { notebook: { shares: { some: { sharedWithId: userId, permission: 'EDIT' } } } } },
          { shares: { some: { sharedWithId: userId, permission: 'EDIT' } } }
        ]
      },
    });

    if (!note) {
      return res.status(404).json({ error: 'Note not found or insufficient permissions' });
    }

    await prisma.note.update({
      where: { id: noteId },
      data: { deletedAt: new Date(), isArchived: true },
    });

    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
};

export const duplicateNote = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { sectionId, noteId } = req.params;

    const note = await prisma.note.findFirst({
      where: { 
        id: noteId,
        sectionId,
        OR: [
          { userId },
          { section: { notebook: { shares: { some: { sharedWithId: userId } } } } },
          { shares: { some: { sharedWithId: userId } } }
        ]
      },
    });

    if (!note) {
      return res.status(404).json({ error: 'Note not found or access denied' });
    }

    const maxSort = await prisma.note.aggregate({
      where: { sectionId },
      _max: { sortOrder: true },
    });
    const nextSortOrder = (maxSort._max.sortOrder ?? -1) + 1;

    // Prisma doesn't like passing JSON without stringifying if it's deeply nested, but JsonB should be fine
    // However, it's safer to read the object and pass it.
    const duplicate = await prisma.note.create({
      data: {
        title: `${note.title} (Copy)`,
        content: note.content || {},
        plaintext: note.plaintext,
        sectionId: note.sectionId,
        userId: note.userId,
        sortOrder: nextSortOrder,
      },
    });

    res.status(201).json(duplicate);
  } catch (error) {
    console.error('Error duplicating note:', error);
    res.status(500).json({ error: 'Failed to duplicate note' });
  }
};

export const addNoteToMyFiles = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { noteId } = req.params;
    const { targetSectionId, targetNotebookId } = req.body || {};

    // 1. Find the shared note
    const sourceNote = await prisma.note.findFirst({
      where: { id: noteId, deletedAt: null },
      include: {
        section: { include: { notebook: true } }
      }
    });

    if (!sourceNote) {
      return res.status(404).json({ error: 'Shared note not found' });
    }

    // 2. Resolve or create target section in user's notebook
    let destSectionId = targetSectionId;

    if (!destSectionId && targetNotebookId) {
      const sec = await prisma.section.findFirst({
        where: { notebookId: targetNotebookId, deletedAt: null },
        orderBy: { sortOrder: 'asc' }
      });
      if (sec) destSectionId = sec.id;
    }

    if (!destSectionId) {
      // Find or create default notebook for user
      let nb = await prisma.notebook.findFirst({
        where: { userId, isArchived: false, deletedAt: null },
        include: { sections: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } } }
      });

      if (!nb) {
        nb = await prisma.notebook.create({
          data: {
            title: 'My Notebook',
            userId,
            color: '#7719aa'
          },
          include: { sections: true }
        });
      }

      let sec = nb.sections && nb.sections.length > 0 ? nb.sections[0] : null;
      if (!sec) {
        sec = await prisma.section.create({
          data: {
            title: 'Main',
            notebookId: nb.id,
            color: '#7719aa'
          }
        });
      }

      destSectionId = sec.id;
    }

    // 3. Create the note under the user's section
    const maxSort = await prisma.note.aggregate({
      where: { sectionId: destSectionId },
      _max: { sortOrder: true }
    });
    const nextSortOrder = (maxSort._max.sortOrder ?? -1) + 1;

    const newNote = await prisma.note.create({
      data: {
        title: sourceNote.title,
        content: (sourceNote.content as any) || {},
        plaintext: sourceNote.plaintext || '',
        sectionId: destSectionId,
        userId,
        sortOrder: nextSortOrder,
      },
      include: {
        section: {
          include: { notebook: true }
        }
      }
    });

    // Also link note share for collaboration tracking between both users
    try {
      await prisma.noteShare.upsert({
        where: {
          noteId_sharedWithId: {
            noteId: sourceNote.id,
            sharedWithId: userId
          }
        },
        update: {},
        create: {
          noteId: sourceNote.id,
          ownerId: sourceNote.userId,
          sharedWithId: userId,
          permission: 'EDIT'
        }
      });

      if (sourceNote.userId !== userId) {
        await prisma.noteShare.upsert({
          where: {
            noteId_sharedWithId: {
              noteId: newNote.id,
              sharedWithId: sourceNote.userId
            }
          },
          update: {},
          create: {
            noteId: newNote.id,
            ownerId: userId,
            sharedWithId: sourceNote.userId,
            permission: 'EDIT'
          }
        });
      }
    } catch (e) {
      console.warn('Error linking collaboration shares:', e);
    }

    res.status(201).json(newNote);
  } catch (error) {
    console.error('Error adding note to my files:', error);
    res.status(500).json({ error: 'Failed to add note to files' });
  }
};

export const searchNotes = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { q, notebookId, sectionId, tags, isPinned, isFavorite, limit = '20', offset = '0' } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Search query "q" is required' });
    }

    // Build base conditions
    let conditions = `n."userId" = $1::uuid AND n."deletedAt" IS NULL AND n."isArchived" = false`;
    let params: any[] = [userId, q];
    let paramIndex = 3;

    if (notebookId) {
      conditions += ` AND s."notebookId" = $${paramIndex}::uuid`;
      params.push(notebookId);
      paramIndex++;
    }

    if (sectionId) {
      conditions += ` AND n."sectionId" = $${paramIndex}::uuid`;
      params.push(sectionId);
      paramIndex++;
    }

    if (isPinned === 'true') conditions += ` AND n."isPinned" = true`;
    if (isFavorite === 'true') conditions += ` AND n."isFavorite" = true`;

    // Limit and Offset
    const parsedLimit = parseInt(limit as string, 10) || 20;
    const parsedOffset = parseInt(offset as string, 10) || 0;
    params.push(parsedLimit, parsedOffset);

    const limitParam = paramIndex;
    const offsetParam = paramIndex + 1;

    // We do a raw query for full-text search
    // websearch_to_tsquery gives a good google-like search syntax support
    const rawQuery = `
      SELECT 
        n.id, n.title, n."sectionId", n."isPinned", n."isFavorite", n."updatedAt",
        s."notebookId",
        ts_headline('english', coalesce(n.plaintext, ''), websearch_to_tsquery('english', $2), 'StartSel=<b>, StopSel=</b>, MaxWords=35, MinWords=15') as preview,
        ts_rank(n."searchVector", websearch_to_tsquery('english', $2)) as rank,
        COALESCE(json_agg(json_build_object('id', t.id, 'name', t.name, 'color', t.color)) FILTER (WHERE t.id IS NOT NULL), '[]') as tags
      FROM notes n
      JOIN sections s ON n."sectionId" = s.id
      LEFT JOIN note_tags nt ON n.id = nt."noteId"
      LEFT JOIN tags t ON nt."tagId" = t.id
      WHERE ${conditions} AND n."searchVector" @@ websearch_to_tsquery('english', $2)
      GROUP BY n.id, s."notebookId"
      ORDER BY rank DESC, n."updatedAt" DESC
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `;

    // Count query for pagination
    const countQuery = `
      SELECT count(*) as total
      FROM notes n
      JOIN sections s ON n."sectionId" = s.id
      WHERE ${conditions} AND n."searchVector" @@ websearch_to_tsquery('english', $2)
    `;

    const [results, countResult] = await Promise.all([
      prisma.$queryRawUnsafe<any[]>(rawQuery, ...params),
      prisma.$queryRawUnsafe<any[]>(countQuery, ...params.slice(0, -2))
    ]);

    const total = countResult[0] ? Number(countResult[0].total) : 0;

    res.json({
      data: results,
      pagination: {
        total,
        limit: parsedLimit,
        offset: parsedOffset
      }
    });
  } catch (error) {
    console.error('Error searching notes:', error);
    res.status(500).json({ error: 'Failed to search notes' });
  }
};

export const getTrashedNotes = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const notes = await prisma.note.findMany({
      where: { 
        userId, 
        OR: [
          { deletedAt: { not: null } },
          { isArchived: true }
        ]
      },
      orderBy: { deletedAt: 'desc' },
      include: {
        section: {
          include: { notebook: true }
        }
      }
    });

    res.json(notes);
  } catch (error) {
    console.error('Error fetching trashed notes:', error);
    res.status(500).json({ error: 'Failed to fetch trashed notes' });
  }
};

export const restoreNote = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { noteId } = req.params;

    const note = await prisma.note.findFirst({
      where: { id: noteId, userId },
    });

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const updated = await prisma.note.update({
      where: { id: noteId },
      data: { deletedAt: null, isArchived: false },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error restoring note:', error);
    res.status(500).json({ error: 'Failed to restore note' });
  }
};

export const permanentDeleteNote = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { noteId } = req.params;

    const note = await prisma.note.findFirst({
      where: { id: noteId, userId },
    });

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    await prisma.note.delete({
      where: { id: noteId },
    });

    res.json({ message: 'Note permanently deleted' });
  } catch (error) {
    console.error('Error permanently deleting note:', error);
    res.status(500).json({ error: 'Failed to permanently delete note' });
  }
};

