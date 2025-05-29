import { loadEnvironmentVariables } from '@/lib/config/env-loader';

// This is a server component that loads environment variables
// It runs before any other components that might need them
export default async function EnvInit({
  children,
}: { children: React.ReactNode }) {
  await loadEnvironmentVariables();
  return <>{children}</>;
}
