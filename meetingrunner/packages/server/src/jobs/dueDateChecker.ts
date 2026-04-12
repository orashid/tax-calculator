import { prisma } from '../db.js';
import { createNotification } from '../services/notificationService.js';
import { DUE_DATE_CHECK_INTERVAL } from '@meetingrunner/shared';

export function startDueDateChecker(): void {
  // Run immediately on start, then on interval
  checkDueDates();
  setInterval(checkDueDates, DUE_DATE_CHECK_INTERVAL);
}

async function checkDueDates(): Promise<void> {
  try {
    const now = new Date();
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Find cards that are approaching due date (within 24 hours)
    const approachingCards = await prisma.card.findMany({
      where: {
        dueDate: {
          gte: now,
          lte: oneDayFromNow,
        },
      },
      include: {
        assignees: true,
      },
    });

    for (const card of approachingCards) {
      for (const assignee of card.assignees) {
        // Check if we already sent this notification recently
        const existing = await prisma.notification.findFirst({
          where: {
            userId: assignee.userId,
            cardId: card.id,
            type: 'due_approaching',
            createdAt: { gte: new Date(now.getTime() - DUE_DATE_CHECK_INTERVAL) },
          },
        });
        if (!existing) {
          await createNotification(
            assignee.userId,
            'due_approaching',
            card.id,
            `"${card.title}" is due soon`,
          );
        }
      }
    }

    // Find overdue cards
    const overdueCards = await prisma.card.findMany({
      where: {
        dueDate: { lt: now },
      },
      include: {
        assignees: true,
      },
    });

    for (const card of overdueCards) {
      for (const assignee of card.assignees) {
        const existing = await prisma.notification.findFirst({
          where: {
            userId: assignee.userId,
            cardId: card.id,
            type: 'due_overdue',
            createdAt: { gte: new Date(now.getTime() - DUE_DATE_CHECK_INTERVAL) },
          },
        });
        if (!existing) {
          await createNotification(
            assignee.userId,
            'due_overdue',
            card.id,
            `"${card.title}" is overdue`,
          );
        }
      }
    }
  } catch (error) {
    console.error('Due date checker error:', error);
  }
}
