'use server';

import type { UIMessage } from 'ai';
import { cookies } from 'next/headers';
import {
  deleteMessagesByChatIdAfterTimestamp,
  getMessageById,
  updateChatVisiblityById,
} from '@/lib/api/chats';
import type { VisibilityType } from '@/components/visibility-selector';
import { generateTitle } from '@/lib/api/titles';

export async function saveChatModelAsCookie(model: string) {
  const cookieStore = await cookies();
  cookieStore.set('default-model', model);
}

export async function generateTitleFromUserMessage({
  message,
}: {
  message: UIMessage;
}) {
  try {
    // Extract the message content from the first part
    const firstPart = message.parts[0];
    const messageContent =
      firstPart && 'text' in firstPart ? firstPart.text : '';

    // Use our backend integration to generate the title
    const title = await generateTitle(messageContent);
    console.log('generateTitle:', message, title);

    return title;
  } catch (error) {
    console.error('Error generating title with backend:', error);
    // Fallback to a generic title
    return 'New conversation';
  }
}

export async function deleteTrailingMessages({ id }: { id: string }) {
  const [message] = await getMessageById({ id });

  await deleteMessagesByChatIdAfterTimestamp({
    chatId: message.chatId,
    timestamp: message.createdAt,
  });
}

export async function updateChatVisibility({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: VisibilityType;
}) {
  await updateChatVisiblityById({ chatId, visibility });
}
