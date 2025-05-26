import { z } from 'zod';

// Schema for title generation request - Option 1 (simple string)
export const titleGenerateRequestSimpleSchema = z.object({
  message: z.string().min(1),
});

// Schema for title generation request - Option 2 (structured)
export const titleGenerateRequestStructuredSchema = z.object({
  message: z.object({
    text: z.string().min(1),
    type: z.literal('text'),
  }),
});

// Union schema that accepts either format
export const titleGenerateRequestSchema = z.union([
  titleGenerateRequestSimpleSchema,
  titleGenerateRequestStructuredSchema,
]);

// Schema for title generation response
export const titleGenerateResponseSchema = z.object({
  text: z.string(),
});
