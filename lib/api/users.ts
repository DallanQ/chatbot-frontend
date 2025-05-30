import 'server-only';
import { callBackend, generateHashedPassword } from './utils';
import {
  type User,
  userSchema,
  messageCountResponseSchema,
} from '@/lib/models/user';
import { chatsResponseSchema } from '@/lib/models/chat';

export async function getUser(email: string): Promise<Array<User>> {
  try {
    const user = await callBackend<User>(
      `/api/users/${encodeURIComponent(email)}`,
      {
        method: 'GET',
      },
    );

    // Parse and validate the response
    const validatedUser = userSchema.parse(user);

    // Return as array to match existing interface
    return [validatedUser];
  } catch (error: any) {
    if (error.status === 404) {
      // Return empty array when user not found to match existing behavior
      return [];
    }
    console.error('Failed to get user from backend');
    throw error;
  }
}

export async function createUser(email: string, password: string) {
  try {
    const passwordHash = generateHashedPassword(password);
    await callBackend(`/api/users`, {
      method: 'POST',
      body: { email, passwordHash },
    });
  } catch (error) {
    console.error('Failed to create user in backend');
    throw error;
  }
}

export async function createGuestUser() {
  try {
    const response = await callBackend<User>(`/api/users/guest`, {
      method: 'POST',
    });

    // Parse and validate the response
    const user = userSchema.parse(response);

    // Return in array format to match existing interface
    return [
      {
        id: user.id,
        email: user.email,
      },
    ];
  } catch (error) {
    console.error('Failed to create guest user in backend');
    throw error;
  }
}

export async function getOrCreateUserFromOAuth({
  email,
  provider,
  providerAccountId,
}: {
  email?: string | null;
  provider: string;
  providerAccountId: string;
}) {
  try {
    const response = await callBackend<User>(`/api/users/oauth`, {
      method: 'POST',
      body: {
        email: email || undefined,
        provider,
        providerAccountId,
      },
    });

    // Parse and validate the response
    const user = userSchema.parse(response);

    return user;
  } catch (error) {
    console.error('Failed to get or create OAuth user in backend');
    throw error;
  }
}

export async function getChatsByUserId({
  id,
  limit,
  startingAfter,
  endingBefore,
}: {
  id: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) {
  try {
    const params = new URLSearchParams();
    params.set('limit', limit.toString());

    if (startingAfter) {
      params.set('startingAfter', startingAfter);
    }

    if (endingBefore) {
      params.set('endingBefore', endingBefore);
    }

    const response = await callBackend<any>(
      `/api/users/${id}/chats?${params.toString()}`,
      {
        method: 'GET',
      },
    );

    // Parse and validate the response
    const validated = chatsResponseSchema.parse(response);

    return validated;
  } catch (error) {
    console.error('Failed to get chats by user from backend');
    throw error;
  }
}

export async function getMessageCountByUserId({
  id,
  differenceInHours,
}: { id: string; differenceInHours: number }) {
  try {
    const params = new URLSearchParams();
    params.set('hours', differenceInHours.toString());

    const response = await callBackend<any>(
      `/api/users/${id}/message-count?${params.toString()}`,
      {
        method: 'GET',
      },
    );

    // Parse and validate the response
    const validated = messageCountResponseSchema.parse(response);

    return validated.count;
  } catch (error) {
    console.error(
      'Failed to get message count by user id for the last hours from backend',
    );
    throw error;
  }
}
