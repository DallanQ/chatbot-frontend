import {
  appendClientMessage,
  appendResponseMessages,
  createDataStream,
} from 'ai';
import { auth, type UserType } from '@/app/(auth)/auth';
import {
  createStreamId,
  deleteChatById,
  getChatById,
  getMessagesByChatId,
  getStreamIdsByChatId,
  saveChat,
  saveMessages,
  streamChatResponse,
} from '@/lib/api/chats';
import { getMessageCountByUserId } from '@/lib/api/users';
import { generateUUID, getTrailingMessageId } from '@/lib/utils';
import { generateTitleFromUserMessage } from '../../actions';
import { postRequestBodySchema, type PostRequestBody } from './schema';
import type { Chat } from '@/lib/models/chat';
import { differenceInSeconds } from 'date-fns';
import { entitlementsByUserType } from '@/lib/config/entitlements';
import { getStreamContext } from '@/lib/api/stream';

export const maxDuration = 60;

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (_) {
    return new Response('Invalid request body', { status: 400 });
  }

  try {
    const { id, message, selectedChatModel, selectedVisibilityType } =
      requestBody;

    const session = await auth();

    if (!session?.user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const userType: UserType = session.user.type;

    const messageCount = await getMessageCountByUserId({
      id: session.user.id,
      differenceInHours: 24,
    });

    if (messageCount > entitlementsByUserType[userType].maxMessagesPerDay) {
      return new Response(
        'You have exceeded your maximum number of messages for the day! Please try again later.',
        {
          status: 429,
        },
      );
    }

    const chat = await getChatById({ id });

    if (!chat) {
      const title = await generateTitleFromUserMessage({
        // @ts-expect-error: AI SDK types - using parts format instead of content
        message,
      });

      await saveChat({
        id,
        userId: session.user.id,
        title,
        visibility: selectedVisibilityType,
      });
    } else {
      if (chat.userId !== session.user.id) {
        return new Response('Forbidden', { status: 403 });
      }
    }

    const previousMessages = await getMessagesByChatId({ id });

    const messages = appendClientMessage({
      // @ts-expect-error: todo add type conversion from DBMessage[] to UIMessage[]
      messages: previousMessages,
      // @ts-expect-error: AI SDK types - using parts format instead of content
      message,
    });

    // Geolocation data is available but not currently used
    // const { longitude, latitude, city, country } = geolocation(request);

    await saveMessages({
      messages: [
        {
          chatId: id,
          id: message.id,
          role: 'user',
          parts: message.parts,
          attachments: message.experimental_attachments ?? [],
          createdAt: new Date(),
        },
      ],
    });

    const streamId = generateUUID();
    await createStreamId({ id: streamId, chatId: id });

    // Create data stream that uses our backend integration
    const stream = createDataStream({
      execute: async (dataStream) => {
        try {
          // Create the stream from backend
          const result = await streamChatResponse({
            messages,
            userId: session.user.id,
            userType: session.user.type,
            chatId: id,
            onFinish: async ({ response }) => {
              if (session.user?.id) {
                try {
                  const assistantId = getTrailingMessageId({
                    messages: response.messages.filter(
                      (message: any) => message.role === 'assistant',
                    ),
                  });

                  if (!assistantId) {
                    throw new Error('No assistant message found!');
                  }

                  const [, assistantMessage] = appendResponseMessages({
                    // @ts-expect-error: AI SDK types - using parts format instead of content
                    messages: [message],
                    responseMessages: response.messages,
                  });

                  await saveMessages({
                    messages: [
                      {
                        id: assistantId,
                        chatId: id,
                        role: assistantMessage.role,
                        parts: assistantMessage.parts
                          ? assistantMessage.parts
                              .filter((part: any) => part.type === 'text') // we only handle text parts
                              .map((part: any) => ({
                                type: 'text' as const,
                                text: part.text,
                              }))
                          : [
                              {
                                type: 'text' as const,
                                text: assistantMessage.content, // old format
                              },
                            ],
                        attachments: [],
                        createdAt: new Date(),
                      },
                    ],
                  });
                } catch (err) {
                  console.error('Failed to save chat', err);
                }
              }
            },
          });

          // Consume the stream and merge it into the dataStream
          result.consumeStream();
          result.mergeIntoDataStream(dataStream);
        } catch (executeError) {
          console.error(
            '[chat/route.ts] Error in stream execution:',
            executeError,
          );
          console.error(
            '[chat/route.ts] Execute error stack:',
            executeError instanceof Error
              ? executeError.stack
              : 'No stack trace',
          );
          throw executeError; // Re-throw to trigger onError
        }
      },
      // onFinish handler now passed directly to streamFromBackend
      onError: (error: unknown) => {
        console.error('[chat/route.ts] Stream error:', error);
        console.error(
          '[chat/route.ts] Error stack:',
          error instanceof Error ? error.stack : 'No stack trace',
        );
        console.error(
          '[chat/route.ts] Error message:',
          error instanceof Error ? error.message : 'No error message',
        );
        return 'Oops, an error occurred!';
      },
    });

    const streamContext = getStreamContext();

    if (streamContext) {
      return new Response(
        await streamContext.resumableStream(streamId, () => stream),
      );
    } else {
      return new Response(stream);
    }
  } catch (error) {
    console.error('Unexpected error in chat API:', error);
    return new Response('An error occurred while processing your request!', {
      status: 500,
    });
  }
}

export async function GET(request: Request) {
  const streamContext = getStreamContext();
  const resumeRequestedAt = new Date();

  if (!streamContext) {
    return new Response(null, { status: 204 });
  }

  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get('chatId');

  if (!chatId) {
    return new Response('id is required', { status: 400 });
  }

  const session = await auth();

  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  let chat: Chat | undefined;

  try {
    chat = await getChatById({ id: chatId });
  } catch {
    return new Response('Not found', { status: 404 });
  }

  if (!chat) {
    return new Response('Not found', { status: 404 });
  }

  if (chat.visibility === 'private' && chat.userId !== session.user.id) {
    return new Response('Forbidden', { status: 403 });
  }

  const streamIds = await getStreamIdsByChatId({ chatId });

  if (!streamIds.length) {
    return new Response('No streams found', { status: 404 });
  }

  const recentStreamId = streamIds.at(-1);

  if (!recentStreamId) {
    return new Response('No recent stream found', { status: 404 });
  }

  const emptyDataStream = createDataStream({
    execute: () => {},
  });

  const stream = await streamContext.resumableStream(
    recentStreamId,
    () => emptyDataStream,
  );

  /*
   * For when the generation is streaming during SSR
   * but the resumable stream has concluded at this point.
   */
  if (!stream) {
    const messages = await getMessagesByChatId({ id: chatId });
    const mostRecentMessage = messages.at(-1);

    if (!mostRecentMessage) {
      return new Response(emptyDataStream, { status: 200 });
    }

    if (mostRecentMessage.role !== 'assistant') {
      return new Response(emptyDataStream, { status: 200 });
    }

    const messageCreatedAt = new Date(mostRecentMessage.createdAt);

    if (differenceInSeconds(resumeRequestedAt, messageCreatedAt) > 15) {
      return new Response(emptyDataStream, { status: 200 });
    }

    const restoredStream = createDataStream({
      execute: (buffer) => {
        buffer.writeData({
          type: 'append-message',
          message: JSON.stringify(mostRecentMessage),
        });
      },
    });

    return new Response(restoredStream, { status: 200 });
  }

  return new Response(stream, { status: 200 });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Not Found', { status: 404 });
  }

  const session = await auth();

  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (!chat) {
      return new Response('Not Found', { status: 404 });
    }

    if (chat.userId !== session.user.id) {
      return new Response('Forbidden', { status: 403 });
    }

    await deleteChatById({ id });

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error(error);
    return new Response('An error occurred while processing your request!', {
      status: 500,
    });
  }
}
