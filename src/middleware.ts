export { default } from 'next-auth/middleware'

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/timesheets/:path*',
    '/approvals/:path*',
    '/reports/:path*',
    '/admin/:path*',
  ],
}
