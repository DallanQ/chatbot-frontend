import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { guestRegex, isDevelopmentEnvironment } from './lib/config/constants';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /*
   * Playwright starts the dev server and requires a 200 status to
   * begin the tests, so this ensures that the tests can start
   */
  if (pathname.startsWith('/ping')) {
    return new Response('pong', { status: 200 });
  }

  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: !isDevelopmentEnvironment,
  });

  if (!token) {
    // Debug: Log URL construction values
    console.log('[middleware] URL debug:');
    console.log('[middleware] request.url:', request.url);
    console.log('[middleware] request.nextUrl.host:', request.nextUrl.host);
    console.log('[middleware] host header:', request.headers.get('host'));
    console.log(
      '[middleware] x-forwarded-proto:',
      request.headers.get('x-forwarded-proto'),
    );
    console.log('[middleware] protocol:', request.nextUrl.protocol);

    // Use the actual host from headers instead of request.url which shows localhost
    const host = request.headers.get('host') || request.nextUrl.host;
    const protocol =
      request.headers.get('x-forwarded-proto') ||
      request.nextUrl.protocol.slice(0, -1);
    const actualUrl = `${protocol}://${host}${request.nextUrl.pathname}${request.nextUrl.search}`;
    const redirectUrl = encodeURIComponent(actualUrl);

    console.log('[middleware] constructed actualUrl:', actualUrl);
    console.log('[middleware] encoded redirectUrl:', redirectUrl);

    return NextResponse.redirect(
      new URL(`/api/auth/guest?redirectUrl=${redirectUrl}`, request.url),
    );
  }

  const isGuest = guestRegex.test(token?.email ?? '');

  if (token && !isGuest && ['/login', '/register'].includes(pathname)) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/chat/:id',
    '/api/:path*',
    '/login',
    '/register',

    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
