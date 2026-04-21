import { NextAuthOptions, User } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { JWT } from 'next-auth/jwt'
import { Session } from 'next-auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })
        if (!user) return null

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password)
        if (!isPasswordValid) return null

        return {
          id:         user.id,
          email:      user.email,
          name:       user.name,
          role:       user.role,
          department: user.department,
        } as User & { role: string; department: string | null }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: User }) {
      if (user) {
        token.id         = user.id
        token.role       = (user as User & { role: string }).role
        token.department = (user as User & { department: string | null }).department
      }
      return token
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (token && session.user) {
        session.user.id         = token.id as string
        session.user.role       = token.role as string
        session.user.department = token.department as string
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