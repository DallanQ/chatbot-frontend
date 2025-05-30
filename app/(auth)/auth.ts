import { compare } from 'bcrypt-ts';
import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import {
  createGuestUser,
  getUser,
  getOrCreateUserFromOAuth,
} from '@/lib/api/users';
import { authConfig } from './auth.config';
import type { DefaultJWT } from 'next-auth/jwt';
import { isTestEnvironment } from '@/lib/config/constants';

export type UserType = 'guest' | 'regular';

declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string;
      type: UserType;
    } & DefaultSession['user'];
  }

  interface User {
    id?: string;
    email?: string | null;
    type: UserType;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string;
    type: UserType;
  }
}

// Build providers array conditionally based on environment
const getProviders = () => {
  const providers: any[] = [
    GoogleProvider({
      // Client ID can be public - it's visible in the browser anyway
      clientId: process.env.GOOGLE_CLIENT_ID || 'not-configured',
      // Client secret is only used server-side
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'not-configured',
    }),
  ];

  // Add email/password authentication only in test environments
  if (isTestEnvironment) {
    providers.push(
      Credentials({
        credentials: {},
        async authorize({ email, password }: any) {
          const users = await getUser(email);

          if (users.length === 0) {
            return null;
          }

          const [user] = users;

          if (!user.passwordHash) {
            return null;
          }

          const passwordsMatch = await compare(password, user.passwordHash);

          if (!passwordsMatch) return null;

          return { ...user, type: 'regular', passwordHash: undefined };
        },
      }),
    );
  }

  // Always add guest authentication
  providers.push(
    Credentials({
      id: 'guest',
      credentials: {},
      async authorize() {
        const [guestUser] = await createGuestUser();
        return { ...guestUser, type: 'guest' };
      },
    }),
  );

  return providers;
};

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  ...authConfig,
  providers: getProviders(),
  callbacks: {
    async signIn({ user, account, profile }) {
      // Handle OAuth sign-ins (Google)
      if (account?.provider === 'google') {
        try {
          // Get or create user in database from OAuth profile
          const dbUser = await getOrCreateUserFromOAuth({
            email: profile?.email,
            provider: account.provider,
            providerAccountId:
              account.providerAccountId ??
              (() => {
                throw new Error('providerAccountId is required for OAuth');
              })(),
          });

          // Update the user object with database ID and type
          if (dbUser) {
            user.id = dbUser.id;
            user.type = 'regular';
            return true;
          }
        } catch (error) {
          console.error('OAuth user creation failed:', error);
          return false;
        }
      }

      return true; // Allow sign in for other providers (guest)
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.type = user.type;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.type = token.type;
      }

      return session;
    },
  },
});
