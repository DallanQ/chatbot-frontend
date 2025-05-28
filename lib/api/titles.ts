import 'server-only';
import { callBackend } from './utils';
import { titleGenerateResponseSchema } from '@/lib/models/title';

/**
 * Generate a title using the backend
 * This is the renamed generateTitleWithBackend function
 */
export async function generateTitle(text: string): Promise<string> {
  // Real implementation for non-test environments
  try {
    const result = await callBackend<any>('/api/titles/generate', {
      method: 'POST',
      body: { text },
    });

    // Parse and validate the response
    const validated = titleGenerateResponseSchema.parse(result);

    return validated.text;
  } catch (error) {
    console.error('Error generating title with backend:', error);
    // Fallback to a generic title
    return 'New conversation';
  }
}
