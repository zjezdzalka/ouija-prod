import { prisma } from '@/lib'

/**
 * Returns the list of userIds that belong to a given chat.
 * Used by controllers to know who to notify over WebSocket.
 */
export async function getChatMemberIds(chatId: string): Promise<string[]> {
  const members = await prisma.chatUser.findMany({
    where: { chatId },
    select: { userId: true }
  })
  return members.map((m: { userId: string }) => m.userId)
}
