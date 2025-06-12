import 'server-only';
import type { DataStreamWriter } from 'ai';
import { callBackend, BackendError } from './utils';
import {
  type Chat,
  type DBMessage,
  chatSchema,
  messageSchema,
  voteSchema,
  streamIdsResponseSchema,
  type SaveMessage,
} from '@/lib/models/chat';
import type { VisibilityType } from '@/components/visibility-selector';

export async function saveChat({
  id,
  userId,
  title,
  visibility,
}: {
  id: string;
  userId: string;
  title: string;
  visibility: VisibilityType;
}) {
  try {
    await callBackend(`/api/chats`, {
      method: 'POST',
      body: {
        id,
        userId,
        title,
        visibility,
      },
    });
  } catch (error) {
    console.error('Failed to save chat in backend');
    throw error;
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    await callBackend(`/api/chats/${id}`, {
      method: 'DELETE',
    });

    // Return undefined to match new behavior
    return undefined;
  } catch (error) {
    console.error('Failed to delete chat by id from backend');
    throw error;
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const response = await callBackend<Chat>(`/api/chats/${id}`, {
      method: 'GET',
    });

    // Parse and validate the response
    const chat = chatSchema.parse(response);

    return chat;
  } catch (error: any) {
    if (error.status === 404) {
      // Return undefined when chat not found to match existing behavior
      return undefined;
    }
    console.error('Failed to get chat by id from backend');
    throw error;
  }
}

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: 'private' | 'public';
}) {
  try {
    await callBackend(`/api/chats/${chatId}/visibility`, {
      method: 'PATCH',
      body: { visibility },
    });
  } catch (error) {
    console.error('Failed to update chat visibility in backend');
    throw error;
  }
}

export async function saveMessages({
  userId,
  messages,
}: {
  userId: string;
  messages: Array<SaveMessage>;
}) {
  try {
    // Extract userId from the first message's chatId lookup
    // In the actual implementation, we might need to get this from session or pass it
    // For now, we'll need to modify this function signature later if needed
    const chatId = messages[0]?.chatId;
    if (!chatId) {
      throw new Error('No messages provided');
    }

    await callBackend(`/api/chats/${chatId}/messages`, {
      method: 'POST',
      body: {
        userId: userId,
        messages,
      },
    });
  } catch (error) {
    console.error('Failed to save messages in backend', error);
    throw error;
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    const response = await callBackend<DBMessage[]>(
      `/api/chats/${id}/messages`,
      {
        method: 'GET',
      },
    );

    // Parse and validate each message
    const messages = response.map((msg) => messageSchema.parse(msg));

    return messages;
  } catch (error) {
    console.error('Failed to get messages by chat id from backend', error);
    throw error;
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: 'up' | 'down';
}) {
  try {
    await callBackend(`/api/chats/${chatId}/messages/${messageId}/vote`, {
      method: 'POST',
      body: { voteType: type },
    });

    // Return void as the result is not used
    return undefined;
  } catch (error) {
    console.error('Failed to upvote message in backend', error);
    throw error;
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    const response = await callBackend<any[]>(`/api/chats/${id}/votes`, {
      method: 'GET',
    });

    // Parse and validate each vote
    const votes = response.map((vote) => voteSchema.parse(vote));

    return votes;
  } catch (error) {
    console.error('Failed to get votes by chat id from backend', error);
    throw error;
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    const response = await callBackend<DBMessage>(`/api/messages/${id}`, {
      method: 'GET',
    });

    // Parse and validate the response
    const message = messageSchema.parse(response);

    // Return as array to match existing interface
    return [message];
  } catch (error: any) {
    if (error.status === 404) {
      // Return empty array when message not found to match existing behavior
      return [];
    }
    console.error('Failed to get message by id from backend');
    throw error;
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    const params = new URLSearchParams();
    params.set('timestamp', timestamp.toISOString());

    await callBackend(`/api/chats/${chatId}/messages?${params.toString()}`, {
      method: 'DELETE',
    });
  } catch (error) {
    console.error(
      'Failed to delete messages by id after timestamp from backend',
    );
    throw error;
  }
}

export async function createStreamId({
  id,
  chatId,
}: {
  id: string;
  chatId: string;
}) {
  try {
    await callBackend(`/api/chats/${chatId}/streams`, {
      method: 'POST',
      body: { id },
    });
  } catch (error) {
    console.error('Failed to create stream id in backend');
    throw error;
  }
}

export async function getStreamIdsByChatId({ chatId }: { chatId: string }) {
  try {
    const response = await callBackend<any>(`/api/chats/${chatId}/streams`, {
      method: 'GET',
    });

    // Parse and validate the response
    const validated = streamIdsResponseSchema.parse(response);

    // Return just the array to match existing interface
    return validated.ids;
  } catch (error) {
    console.error('Failed to get stream ids by chat id from backend');
    throw error;
  }
}

/**
 * Stream chat response from the backend API
 * This is the renamed streamFromBackend function
 */
export async function streamChatResponse(params: {
  messages: any[];
  userId: string;
  userType: string;
  chatId: string;
  onFinish?: ({ response }: { response: any }) => Promise<void>;
}): Promise<{
  consumeStream: () => void;
  mergeIntoDataStream: (dataStream: DataStreamWriter, options?: any) => void;
}> {
  // Extract the onFinish callback and other params
  const { onFinish, chatId, ...otherParams } = params;

  let response: Response;
  try {
    // Real backend API call
    response = await callBackend<Response>(`/api/chats/${chatId}/responses`, {
      method: 'POST',
      body: {
        ...otherParams,
      },
    });
    console.log(
      '[streamChatResponse] Backend call successful, status:',
      response.status,
    );
  } catch (backendError) {
    console.error('[streamChatResponse] Backend call failed:', backendError);
    console.error(
      '[streamChatResponse] Backend error stack:',
      backendError instanceof Error ? backendError.stack : 'No stack trace',
    );
    throw backendError;
  }

  if (!response.body) {
    throw new Error('No response body available');
  }

  // Track the complete response for onFinish callback
  const textParts: string[] = [];
  let messageId: string | null = null;

  // Create a transform stream that simply passes through the data from backend
  // but also collects text parts for the onFinish callback
  const createPassthroughStream = () => {
    return new TransformStream({
      transform(chunk, controller) {
        // Convert chunk to a string if needed
        const chunkStr =
          typeof chunk !== 'string' ? new TextDecoder().decode(chunk) : chunk;
        // Pass through the chunk as-is
        controller.enqueue(chunkStr);

        // Try to extract text content for the response object
        const lines = chunkStr.split('\n');
        for (const line of lines) {
          if (!line.trim()) continue;

          const colonIndex = line.indexOf(':');
          if (colonIndex === -1) continue;

          const type = line.substring(0, colonIndex);
          const content = line.substring(colonIndex + 1);

          if (type === '0') {
            // Text chunk - add to our collected text parts
            try {
              const textContent = JSON.parse(content);
              textParts.push(textContent);
            } catch (e) {
              console.error('Error in text chunk handling:', e);
            }
          } else if (type === 'f') {
            // Extract message ID from the first chunk
            try {
              const metadata = JSON.parse(content);
              if (metadata.messageId) {
                messageId = metadata.messageId;
              }
            } catch (e) {
              console.error('Error parsing message ID in stream:', e);
            }
          }
        }
      },
    });
  };

  // Set up objects to manage the stream consumption
  // These mirror the interface returned by streamText
  let isMerged = false;
  let isConsumed = false;

  return {
    consumeStream: () => {
      // Mark as consumed to prevent duplicate consumption
      isConsumed = true;
    },

    mergeIntoDataStream: (ds: DataStreamWriter, options: any = {}) => {
      // Prevent merging twice
      if (isMerged) {
        return;
      }
      isMerged = true;

      try {
        // Create a fresh copy of the response body as a stream
        // and process it through our transform stream
        const backendStream = response.body;
        // We've already checked response.body is not null above, but TypeScript needs reassurance
        if (!backendStream) {
          throw new Error('Response body stream is null');
        }

        // Process the backend stream through our transform
        const processedStream = backendStream.pipeThrough(
          createPassthroughStream(),
        );

        // Create two identical streams - one for merging, one for monitoring
        const [streamForMerge, streamForMonitor] = processedStream.tee();

        // Use the formatted stream directly without additional wrapping
        // Let the SDK handle message IDs internally

        // Use type assertion to tell TypeScript this is the correct format
        ds.merge(streamForMerge as any);

        // Setup onFinish handler for when the stream completes
        if (onFinish) {
          // Use the monitoring stream to detect completion
          const reader = streamForMonitor.getReader();
          (async () => {
            try {
              while (true) {
                const { done } = await reader.read();
                if (done) {
                  const parts = [
                    { type: 'text', text: textParts.join('') || '' },
                  ];
                  await onFinish({
                    response: {
                      messages: [
                        {
                          id: messageId,
                          role: 'assistant',
                          parts: parts, // modern
                          content: parts, // legacy
                        },
                      ],
                    },
                  });
                  break;
                }
              }
            } catch (err) {
              console.error('Error monitoring stream:', err);
            } finally {
              reader.releaseLock();
            }
          })();
        }
      } catch (error) {
        console.error('Error in backend stream:', error);

        // Handle different error types
        let errorMessage = 'Failed to connect to backend service';

        if (error instanceof BackendError) {
          switch (error.status) {
            case 400:
              errorMessage = 'Bad request to backend';
              break;
            case 401:
              errorMessage = 'Unauthorized request to backend';
              break;
            case 403:
              errorMessage = 'Forbidden request to backend';
              break;
            case 429:
              errorMessage = 'Rate limit exceeded on backend';
              break;
            case 408:
              errorMessage = 'Request to backend timed out';
              break;
            case 422:
              errorMessage =
                'Invalid request format (422 Unprocessable Entity)';
              break;
            default:
              errorMessage = 'An error occurred with the backend service';
          }
        }

        // Write the error directly to the data stream
        // Create a readable stream with the error message
        const encoder = new TextEncoder();
        const errorChunk = encoder.encode(
          `3:${JSON.stringify({ error: errorMessage })}\n`,
        );

        const errorStream = new ReadableStream({
          start(controller) {
            controller.enqueue(errorChunk);
            controller.close();
          },
        });

        // Merge the error stream into the data stream
        ds.merge(errorStream);

        // If onFinish exists, call it with an empty response
        if (onFinish) {
          onFinish({ response: { textParts: [] } }).catch((e) => {
            console.error('Error in onFinish handler:', e);
          });
        }
      }
    },
  };
}
