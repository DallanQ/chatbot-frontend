/**
 * Backend API Integration Utilities
 *
 * This module provides utilities for interacting with the custom backend API
 * and password handling functions.
 *
 * IMPORTANT: This code only runs on the server side and should never be imported
 * directly in client components.
 */

import { generateId } from 'ai';
import { genSaltSync, hashSync } from 'bcrypt-ts';

// Type for backend request options
export type BackendRequestOptions = {
  headers?: Record<string, string>;
  timeout?: number;
};

// Error class for backend request failures
export class BackendError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'BackendError';
  }
}

/**
 * Make a standard request to the backend API
 */
export async function callBackend<T = any>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    body?: any;
    headers?: Record<string, string>;
    timeout?: number;
  } = {},
): Promise<T> {
  const apiBaseUrl = process.env.API_BASE_URL;
  const apiSecret = process.env.API_SECRET;

  if (!apiBaseUrl) {
    throw new Error('API_BASE_URL is not defined');
  }

  if (!apiSecret) {
    throw new Error('API_SECRET is not defined');
  }

  const { method = 'GET', body, headers = {}, timeout = 30000 } = options;

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const url = `${apiBaseUrl}${path}`;
    const fetchHeaders = new Headers(headers);
    fetchHeaders.set('Authorization', `Bearer ${apiSecret}`);

    if (body && !fetchHeaders.has('Content-Type')) {
      fetchHeaders.set('Content-Type', 'application/json');
    }

    const response = await fetch(url, {
      method,
      headers: fetchHeaders,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new BackendError(
        `API request failed with status ${response.status}`,
        response.status,
      );
    }

    // If response is expected to be JSON
    if (response.headers.get('content-type')?.includes('application/json')) {
      return (await response.json()) as T;
    }

    // For non-JSON responses (like streams), return the response directly
    return response as unknown as T;
  } catch (error: unknown) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      throw new BackendError('Request timed out', 408);
    }

    // Re-throw backend errors
    if (error instanceof BackendError) {
      throw error;
    }

    // Handle other errors
    throw new BackendError(
      error instanceof Error ? error.message : 'Unknown error',
      500,
    );
  }
}

/**
 * Generate a hashed password using bcrypt
 */
export function generateHashedPassword(password: string) {
  const salt = genSaltSync(10);
  const hash = hashSync(password, salt);

  return hash;
}

/**
 * Generate a random dummy password and hash it
 */
export function generateDummyPassword() {
  const password = generateId(12);
  const hashedPassword = generateHashedPassword(password);

  return hashedPassword;
}
