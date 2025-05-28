import { isTestEnvironment } from './config/constants';

/**
 * Logs a message when in test environment
 * This is useful for debugging tests
 */
export function logToTestFile(message: string | object) {
  if (!isTestEnvironment) return;

  try {
    const logMessage =
      typeof message === 'object' ? JSON.stringify(message, null, 2) : message;
    
    // Use console.log with a prefix for easy identification in test output
    console.log(`[TEST-LOG] ${new Date().toISOString()} - ${logMessage}`);
  } catch (error) {
    // Silent fail - don't break tests if logging fails
    console.error('Failed to log test message:', error);
  }
}

/**
 * Clears the test log file (no-op for client-side version)
 * Useful at the beginning of test runs
 */
export function clearTestLogs() {
  if (!isTestEnvironment) return;
  console.log('[TEST-LOG] Test logs cleared');
}
