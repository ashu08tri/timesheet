import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Next.js 16 renamed the "middleware" file convention to "proxy". This replaces the
// previous `export { default } from 'next-auth/middleware'`, whose export shape Next
// 16's stricter check on the proxy convention no longer accepts — implemented
// directly with next-auth's getToken() instead so it doesn't depend on that wrapper.
export async function proxy(req: NextRequest) {
  if (req.nextUrl.pathname === '/superadmin/login') return NextResponse.next()

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const isSuperAdminArea = req.nextUrl.pathname.startsWith('/superadmin')

  if (isSuperAdminArea) {
    if (!token || !token.isSuperAdmin) {
      const loginUrl = new URL('/superadmin/login', req.url)
      loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname)
      return NextResponse.redirect(loginUrl)
    }
    return NextResponse.next()
  }

  if (!token || token.isSuperAdmin) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/timesheets/:path*',
    '/approvals/:path*',
    '/reports/:path*',
    '/admin/:path*',
    '/masters/:path*',
    '/superadmin/:path*',
  ],
}
