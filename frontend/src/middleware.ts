import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const role = request.cookies.get('__intellicare_role')?.value;
  const url = request.nextUrl.pathname;

  if (role === 'patient') {
     const restrictedRoutes = ['/patients', '/icu', '/logs', '/users', '/vitals'];
     if (restrictedRoutes.some(route => url.startsWith(route))) {
        return NextResponse.redirect(new URL('/', request.url));
     }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/patients/:path*', '/icu/:path*', '/logs/:path*', '/users/:path*', '/vitals/:path*'],
};
