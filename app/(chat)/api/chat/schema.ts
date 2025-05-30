import { z } from 'zod';

const textPartSchema = z.object({
  text: z.string().min(1).max(2000),
  type: z.enum(['text']),
});

export const postRequestBodySchema = z.object({
  id: z.string().uuid(),
  message: z.object({
    id: z.string().uuid(),
    createdAt: z.coerce.date(),
    role: z.enum(['user']),
    parts: z.array(textPartSchema).min(1),
    experimental_attachments: z
      .array(
        z.object({
          url: z.string().url(),
          name: z.string().min(1).max(2000),
          contentType: z.enum(['image/png', 'image/jpg', 'image/jpeg']),
        }),
      )
      .optional(),
  }),
  selectedChatModel: z.enum(['default-model', 'large-model']),
  selectedVisibilityType: z.enum(['public', 'private']),
});

export type PostRequestBody = z.infer<typeof postRequestBodySchema>;
