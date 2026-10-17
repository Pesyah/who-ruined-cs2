import { PrismaClient } from '../generated/client/index.js';

export const prisma = new PrismaClient();

export async function claimNextJob(leaseMs: number): Promise<{ id: string; matchId: string; type: string } | null> {
  const now = new Date();
  const stale = new Date(now.getTime() - leaseMs);
  await prisma.job.updateMany({
    where: { status: { in: ['PARSING','NORMALIZING','VALIDATING','FEATURIZING','SCORING'] }, leaseUntil: { lt: stale }, attempts: { lt: 3 } },
    data: { status: 'QUEUED', stage: 'QUEUED', leaseUntil: null }
  });
  const candidate = await prisma.job.findFirst({ where: { status: 'QUEUED' }, orderBy: { createdAt: 'asc' }, select: { id: true, matchId: true, type: true } });
  if (!candidate) return null;
  const claimed = await prisma.job.updateMany({
    where: { id: candidate.id, status: 'QUEUED' },
    data: { status: candidate.type === 'RESCORE' ? 'SCORING' : 'PARSING', stage: candidate.type === 'RESCORE' ? 'SCORING' : 'PARSING', attempts: { increment: 1 }, leaseUntil: new Date(now.getTime() + leaseMs) }
  });
  return claimed.count === 1 ? candidate : null;
}
