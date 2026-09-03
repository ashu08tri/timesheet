import { NextAuthOptions, User } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { JWT } from 'next-auth/jwt'
import { Session } from 'next-auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: 'credentials',
      name: 'credentials',
      credentials: {
        company:  { label: 'Company',  type: 'text' },
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password || !credentials?.company) return null

        const company = await prisma.company.findUnique({
          where: { slug: credentials.company },
        })
        if (!company || !company.isActive) return null

        const user = await prisma.user.findUnique({
          where: { companyId_email: { companyId: company.id, email: credentials.email } },
        })
        if (!user) return null

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password)
        if (!isPasswordValid) return null

        if (user.accessStatus === 'BLOCKED') return null

        await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
        await prisma.userActivityLog.create({ data: { userId: user.id, action: 'LOGIN', detail: 'Signed in' } })

        return {
          id:         user.id,
          email:      user.email,
          name:       user.name,
          role:       user.role,
          department: user.department,
          companyId:  user.companyId,
          companySlug: company.slug,
        } as User & { role: string; department: string | null; companyId: string; companySlug: string }
      },
    }),
    // Platform-level login for SuperAdmins — not scoped to any company, used only by
    // the /superadmin control panel.
    CredentialsProvider({
      id: 'superadmin',
      name: 'superadmin',
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const admin = await prisma.superAdmin.findUnique({ where: { email: credentials.email } })
        if (!admin) return null

        const isPasswordValid = await bcrypt.compare(credentials.password, admin.password)
        if (!isPasswordValid) return null

        return {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          isSuperAdmin: true,
        } as User & { isSuperAdmin: true }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: User }) {
      if (user) {
        if ((user as User & { isSuperAdmin?: boolean }).isSuperAdmin) {
          token.id = user.id
          token.name = user.name
          token.isSuperAdmin = true
        } else {
          token.id          = user.id
          token.role        = (user as User & { role: string }).role
          token.department  = (user as User & { department: string | null }).department
          token.companyId   = (user as User & { companyId: string }).companyId
          token.companySlug = (user as User & { companySlug: string }).companySlug
          token.isSuperAdmin = false
        }
      }
      return token
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (token && session.user) {
        session.user.id          = token.id as string
        session.user.isSuperAdmin = !!token.isSuperAdmin
        if (!token.isSuperAdmin) {
          session.user.role        = token.role as string
          session.user.department  = token.department as string
          session.user.companyId   = token.companyId as string
          session.user.companySlug = token.companySlug as string
        }
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error:  '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
}