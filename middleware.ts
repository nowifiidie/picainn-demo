import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from '@/src/i18n/routing';

const intlMiddleware = createMiddleware(routing);

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Exclude API routes from locale routing
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Redirect locale-prefixed admin routes to /admin (e.g., /zh/admin -> /admin)
  if (pathname.match(/^\/(en|zh|zh-TW|ko|th|es|fr|id|ar|de|vi|my)\/admin/)) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin';
    return NextResponse.redirect(url);
  }

  // Handle admin routes with authentication (exclude from locale routing)
  if (pathname.startsWith('/admin')) {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return new NextResponse('Unauthorized', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="Admin Access"',
        },
      });
    }

    // Extract credentials from Basic Auth header
    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [username, password] = credentials.split(':');

    // Verify credentials
    const adminUser = process.env.ADMIN_USER;
    const adminPass = process.env.ADMIN_PASS;

    if (!adminUser || !adminPass) {
      console.error('ADMIN_USER and ADMIN_PASS must be set in environment variables');
      console.error('Make sure .env.local exists and contains ADMIN_USER and ADMIN_PASS');
      console.error('Restart your dev server after creating/updating .env.local');
      return new NextResponse('Server configuration error: ADMIN_USER and ADMIN_PASS must be set in environment variables. Please check .env.local and restart the dev server.', { 
        status: 500 
      });
    }

    if (username !== adminUser || password !== adminPass) {
      return new NextResponse('Unauthorized', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="Admin Access"',
        },
      });
    }

    // Admin routes bypass locale routing - return early
    return NextResponse.next();
  }

  // Apply next-intl middleware for all other routes
  return intlMiddleware(request);
}

export const config = {
  // Match only internationalized pathnames and admin routes
  matcher: ['/', '/(en|zh|zh-TW|ko|th|es|fr|id|ar|de|vi|my)/:path*', '/admin/:path*']
};

