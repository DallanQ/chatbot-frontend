import 'server-only';

/**
 * Load environment variables from AWS Parameter Store when running on Amplify
 * This function is idempotent and only loads secrets if they're not already set
 */
export async function loadEnvironmentVariables() {
  // Skip if not on AWS Amplify or if variables are already loaded
  if (!process.env.AWS_APP_ID || process.env.API_BASE_URL) {
    return;
  }

  try {
    // First check if we can resolve the module
    let amplifyBackend: any;
    try {
      // @ts-ignore - This module is only available when deployed to AWS Amplify
      // eslint-disable-next-line import/no-unresolved
      amplifyBackend = await import('@aws-amplify/backend');
    } catch (error) {
      console.log(
        'AWS Amplify backend package not installed - skipping secret loading',
      );
      return;
    }

    const { secret } = amplifyBackend;

    // Define the secrets we need to load
    const secrets = {
      AUTH_SECRET: 'AUTH_SECRET',
      API_BASE_URL: 'API_BASE_URL',
      API_SECRET: 'API_SECRET',
      REDIS_URL: 'REDIS_URL',
    };

    // Load all secrets in parallel
    const secretPromises = Object.entries(secrets).map(
      async ([envVar, secretKey]) => {
        if (!process.env[envVar]) {
          try {
            // The secret function handles the path format internally
            const value = await secret(secretKey);
            if (value) {
              process.env[envVar] = value;
            }
          } catch (error) {
            console.warn(`Failed to load secret ${secretKey}:`, error);
          }
        }
      },
    );

    await Promise.all(secretPromises);

    console.log('Environment variables loaded from AWS Parameter Store');
  } catch (error) {
    // If AWS dependencies aren't available or there's an error, fail silently
    // This allows the app to work on other platforms
    console.log(
      'Running outside AWS Amplify or unable to load AWS dependencies',
    );
  }
}
