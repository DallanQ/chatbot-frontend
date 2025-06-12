import { z } from 'zod';

// Visibility type schema
export const visibilitySchema = z.enum(['private', 'public']);

// Chat schema - matches the backend Chat model
export const chatSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  createdAt: z.coerce.date(),
  title: z.string(),
  visibility: visibilitySchema,
});

// Export the Chat type to match existing usage
export type Chat = z.infer<typeof chatSchema>;

// Schema for paginated chats response
export const chatsResponseSchema = z.object({
  chats: z.array(chatSchema),
  hasMore: z.boolean(),
});

// Schema for creating a chat
export const createChatRequestSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string(),
  visibility: visibilitySchema,
});

// Schema for updating chat visibility
export const updateChatVisibilityRequestSchema = z.object({
  visibility: visibilitySchema,
});

// Message role schema
export const messageRoleSchema = z.enum([
  'user',
  'assistant',
  'system',
  'data',
]);

// Message schema - matches the backend Message model (v2 format)
export const messageSchema = z.object({
  id: z.string().uuid(),
  chatId: z.string().uuid(),
  createdAt: z.coerce.date(),
  role: messageRoleSchema,
  parts: z.array(
    z.object({
      type: z.literal('text'),
      text: z.string(),
    }),
  ),
  attachments: z.array(z.any()).default([]),
});

// Export the DBMessage type to match existing usage
export type DBMessage = z.infer<typeof messageSchema>;

// Schema for saving messages - no createdAt
export const saveMessageSchema = z.object({
  id: z.string().uuid(),
  chatId: z.string().uuid(),
  role: messageRoleSchema,
  parts: z.array(
    z.object({
      type: z.literal('text'),
      text: z.string(),
    }),
  ),
  attachments: z.array(z.any()).default([]),
});

// Export the SaveMessage type
export type SaveMessage = z.infer<typeof saveMessageSchema>;

// Vote schema
export const voteSchema = z.object({
  chatId: z.string().uuid(),
  messageId: z.string().uuid(),
  isUpvoted: z.boolean(),
});

// Export the Vote type to match existing usage
export type Vote = z.infer<typeof voteSchema>;

// Vote type schema
export const voteTypeSchema = z.enum(['up', 'down']);

// Schema for vote request
export const voteRequestSchema = z.object({
  voteType: voteTypeSchema,
});

// Stream schema
export const streamSchema = z.object({
  id: z.string().uuid(),
  chatId: z.string().uuid(),
  createdAt: z.coerce.date(),
});

// Schema for create stream request
export const createStreamRequestSchema = z.object({
  id: z.string().uuid(),
});

// Schema for stream IDs response - backend returns object with ids array
export const streamIdsResponseSchema = z.object({
  ids: z.array(z.string().uuid()),
});

// Schema for chat stream request
export const chatStreamRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: messageRoleSchema,
      content: z.string(),
      id: z.string().uuid().optional(),
      createdAt: z.coerce.date().optional(),
    }),
  ),
  userId: z.string().uuid(),
});
