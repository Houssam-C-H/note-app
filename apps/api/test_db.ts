import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
prisma.attachment.findFirst({ orderBy: { createdAt: 'desc' } }).then(att => console.log(att)).finally(() => prisma.$disconnect());
