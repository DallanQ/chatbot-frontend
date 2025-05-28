import { z } from 'zod';

// Schema for title generation request
export const titleGenerateRequestSchema = z.object({
  text: z.string().min(1),
});

// Schema for title generation response
export const titleGenerateResponseSchema = z.object({
  text: z.string(),
});
