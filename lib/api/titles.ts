import 'server-only';
import { isTestEnvironment } from '@/lib/constants';
import { callBackend } from './utils';
import { titleGenerateResponseSchema } from './title-schemas';
import { generateTitleWithBackendMock } from './chat-mocks';

/**
 * Generate a title using the backend
 * This is the renamed generateTitleWithBackend function
 */
export async function generateTitle(message: string): Promise<string> {
  // In test environments, return a fixed title
  if (isTestEnvironment) {
    return generateTitleWithBackendMock(message);
  }

  // Real implementation for non-test environments
  try {
    const result = await callBackend<any>('/api/titles/generate', {
      method: 'POST',
      body: { message },
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
