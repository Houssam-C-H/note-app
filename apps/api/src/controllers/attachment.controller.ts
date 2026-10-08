import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export const uploadAttachment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { noteId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const note = await prisma.note.findFirst({
      where: { id: noteId, userId },
    });

    if (!note) {
      fs.unlinkSync(file.path);
      return res.status(404).json({ error: 'Note not found' });
    }

    const fileBuffer = fs.readFileSync(file.path);
    const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // Fix Multer's default latin1 encoding of filenames
    const originalNameUtf8 = Buffer.from(file.originalname, 'latin1').toString('utf8');

    const attachment = await prisma.attachment.create({
      data: {
        noteId,
        userId,
        filename: file.filename,
        originalName: originalNameUtf8,
        mimeType: file.mimetype,
        fileSize: file.size,
        storagePath: file.path,
        checksum,
      },
    });

    // We can't send BigInt directly via JSON, stringify it
    res.status(201).json({
      ...attachment,
      fileSize: attachment.fileSize.toString(),
      url: `/api/attachments/${attachment.id}/download`,
    });
  } catch (error) {
    console.error('Error uploading attachment:', error);
    res.status(500).json({ error: 'Failed to upload attachment' });
  }
};

export const getAttachments = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { noteId } = req.params;

    const attachments = await prisma.attachment.findMany({
      where: { noteId, userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(attachments.map(att => ({
      ...att,
      fileSize: att.fileSize.toString(),
      url: `/api/attachments/${att.id}/download`,
    })));
  } catch (error) {
    console.error('Error fetching attachments:', error);
    res.status(500).json({ error: 'Failed to fetch attachments' });
  }
};

export const downloadAttachment = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const attachment = await prisma.attachment.findUnique({
      where: { id },
    });

    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    if (!fs.existsSync(attachment.storagePath)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(attachment.originalName)}"`);
    
    // Sanitize SVG by preventing script execution
    if (attachment.mimeType === 'image/svg+xml') {
      res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'");
    }

    res.sendFile(path.resolve(attachment.storagePath));
  } catch (error) {
    console.error('Error downloading attachment:', error);
    res.status(500).json({ error: 'Failed to download attachment' });
  }
};

export const deleteAttachment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const attachment = await prisma.attachment.findFirst({
      where: { id, userId },
    });

    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    if (fs.existsSync(attachment.storagePath)) {
      fs.unlinkSync(attachment.storagePath);
    }

    await prisma.attachment.delete({
      where: { id },
    });

    res.json({ message: 'Attachment deleted successfully' });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    res.status(500).json({ error: 'Failed to delete attachment' });
  }
};
