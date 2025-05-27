export const isDevelopmentEnvironment = process.env.NODE_ENV === 'development';
export const isTestEnvironment = Boolean(
  process.env.PLAYWRIGHT_TEST_BASE_URL ||
    process.env.PLAYWRIGHT ||
    process.env.CI_PLAYWRIGHT ||
    // For client-side detection in tests
    process.env.NEXT_PUBLIC_PLAYWRIGHT,
);

export const guestRegex = /^guest-\d+@local\.com$/;
