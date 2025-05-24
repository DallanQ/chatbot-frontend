/**
 * Backend API Mock Implementations for tests
 *
 * This module contains mock implementations of backend API functions
 * that are used during testing. These functions are designed to provide
 * consistent responses in test environments.
 */

import { generateUUID } from '../utils';
import type { DataStreamWriter } from 'ai';

// This function dynamically imports test utilities only in test environments
// It will be tree-shaken in production builds
async function getTestUtils() {
  try {
    // Dynamic import means this code won't be included in production builds
    const { getResponseChunksByPrompt, compareMessages } = await import(
      '@/tests/prompts/utils'
    );
    const { TEST_PROMPTS } = await import('@/tests/prompts/basic');

    return {
      getResponseChunksByPrompt,
      compareMessages,
      TEST_PROMPTS,
    };
  } catch (error) {
    console.warn('Failed to load test utilities:', error);
  }
}

/**
 * Create a mock title for test environments
 */
export async function generateTitleWithBackendMock(
  message: string,
): Promise<string> {
  return 'Test Conversation';
}

/**
 * Create a mock stream for test environments that matches the interface
 * of the real stream but uses predefined responses
 */
export async function streamFromBackendMock(params: {
  messages: any[];
  userId: string;
  chatId: string;
  onFinish?: ({ response }: { response: any }) => Promise<void>;
}) {
  // Load test utilities
  const testUtils = await getTestUtils();

  if (!testUtils) {
    throw new Error('Could not load test utilities in test environment');
  }

  // Generate a messageId
  const messageId = generateUUID();

  // Get the last message - this is what we're responding to
  const lastMessage = params.messages[params.messages.length - 1];

  // Get predefined response chunks for this prompt
  const responseChunks = testUtils.getResponseChunksByPrompt(
    [
      {
        role: lastMessage.role,
        content: [{ type: 'text', text: lastMessage.content }],
      },
    ],
    false,
  );

  return {
    consumeStream: () => {
      // Nothing to do here in mock version
    },

    mergeIntoDataStream: (dataStream: DataStreamWriter) => {
      // Simulate async streaming of response chunks
      (async () => {
        // Extract text parts for the onFinish callback
        const textParts: string[] = [];

        // Gather the text parts for the onFinish callback
        for (const chunk of responseChunks) {
          if (chunk.type === 'text-delta') {
            textParts.push(chunk.textDelta);
          }
        }

        // For tests, we need to send a properly formatted message directly
        // Just like the real API would
        // Create a readable stream from the response chunks
        const encoder = new TextEncoder();

        const textChunks: Uint8Array[] = [];
        textChunks.push(encoder.encode(`f:${JSON.stringify({ messageId })}\n`));
        for (const chunk of responseChunks) {
          if (chunk.type === 'text-delta') {
            textChunks.push(
              encoder.encode(`0:${JSON.stringify(chunk.textDelta)}\n`),
            );
          } else if (chunk.type === 'finish') {
            textChunks.push(
              encoder.encode(
                `e:${JSON.stringify({
                  finishReason: chunk.finishReason,
                  usage: {
                    promptTokens: chunk.usage.promptTokens,
                    completionTokens: chunk.usage.completionTokens,
                  },
                  isContinued: false,
                })}\n`,
              ),
            );
            textChunks.push(
              encoder.encode(
                `d:${JSON.stringify({
                  finishReason: chunk.finishReason,
                  usage: {
                    promptTokens: chunk.usage.promptTokens,
                    completionTokens: chunk.usage.completionTokens,
                  },
                })}\n`,
              ),
            );
          }
        }

        // Create a ReadableStream from our chunks
        const mockStream = new ReadableStream({
          async start(controller) {
            // Send all text chunks
            for (const chunk of textChunks) {
              // Add a short delay before sending each chunk
              await new Promise((resolve) => setTimeout(resolve, 50));
              controller.enqueue(chunk);
            }

            controller.close();
          },
        });

        // Merge the mock stream into the data stream
        dataStream.merge(mockStream);

        // If onFinish callback is provided, call it with the collected response
        if (params.onFinish) {
          const parts = [{ type: 'text', text: textParts.join('') || '' }];
          await params.onFinish({
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
        }
      })();
    },
  };
}
