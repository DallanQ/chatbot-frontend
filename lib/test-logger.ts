import fs from 'node:fs';
import path from 'node:path';
import { isTestEnvironment } from './constants';

/**
 * Logs a message to a file when in test environment
 * This is useful for debugging tests since console logs might not be visible
 */
export function logToTestFile(message: string | object) {
  if (!isTestEnvironment) return;

  try {
    const logMessage =
      typeof message === 'object' ? JSON.stringify(message, null, 2) : message;

    fs.appendFileSync(
      path.join(process.cwd(), 'test-logs.txt'),
      `${new Date().toISOString()} - ${logMessage}\n`,
    );
  } catch (error) {
    // Silent fail - don't break tests if logging fails
    console.error('Failed to write to test log file:', error);
  }
}

/**
 * Clears the test log file
 * Useful at the beginning of test runs
 */
export function clearTestLogs() {
  if (!isTestEnvironment) return;

  try {
    fs.writeFileSync(path.join(process.cwd(), 'test-logs.txt'), '');
  } catch (error) {
    console.error('Failed to clear test log file:', error);
  }
}
