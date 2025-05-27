import { z } from 'zod';

// User source types
export const userSourceSchema = z.enum(['email', 'guest', 'oauth']);
export type UserSource = z.infer<typeof userSourceSchema>;

// User schema - matches the backend User model
export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  passwordHash: z.string().optional(),
  source: userSourceSchema,
  createdAt: z.coerce.date(),
  provider: z.string().optional(),
  providerAccountId: z.string().optional(),
  stripeCustomerId: z.string().optional(),
  activeSubscriptionId: z.string().optional(),
  subscriptionStatus: z.string().optional(),
  planId: z.string().optional(),
  currentPeriodStart: z.coerce.date().optional(),
  currentPeriodEnd: z.coerce.date().optional(),
  cancelAtPeriodEnd: z.boolean().default(false),
});

// Export the User type to match existing usage
export type User = z.infer<typeof userSchema>;

// Schema for creating a user with email/password
export const createUserRequestSchema = z.object({
  email: z.string().email(),
  passwordHash: z.string(),
});

// Schema for OAuth user creation/retrieval
export const oauthUserRequestSchema = z.object({
  email: z.string().email().optional(),
  provider: z.string(),
  providerAccountId: z.string(),
});

// Schema for message count response
export const messageCountResponseSchema = z.object({
  count: z.number().int().min(0),
});
