import { NextAuthOptions, type Provider } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { authenticator } from 'otplib'
import { prisma } from './prisma'

// Detect if OIDC is configured
const oidcEnabled = !!(
  process.env.OIDC_ISSUER &&
  process.env.OIDC_CLIENT_ID &&
  process.env.OIDC_CLIENT_SECRET
)

// Generic OIDC Provider
function OIDCProvider(): Provider {
  const issuer = process.env.OIDC_ISSUER?.replace(/\/$/, '') || ''
  return {
    id: 'oidc',
    name: process.env.OIDC_PROVIDER_NAME || 'SSO',
    type: 'oauth',
    wellKnown: `${issuer}/.well-known/openid-configuration`,
    authorization: {
      params: {
        scope: 'openid email profile',
      },
    },
    clientId: process.env.OIDC_CLIENT_ID!,
    clientSecret: process.env.OIDC_CLIENT_SECRET!,
    idToken: true,
    checks: ['pkce', 'state'],
    profile(profile: any) {
      return {
        id: profile.sub,
        name: profile.name ?? profile.email,
        email: profile.email,
      }
    },
  } as any
}

export const authOptions: NextAuthOptions = {
  providers: oidcEnabled
    ? [OIDCProvider()]
    : [
        CredentialsProvider({
          name: 'credentials',
          credentials: {
            email: { label: 'Email', type: 'email' },
            password: { label: 'Passwort', type: 'password' },
            totpCode: { label: 'TOTP Code', type: 'text' },
          },
          async authorize(credentials) {
            if (!credentials?.email || !credentials?.password) {
              throw new Error('Email und Passwort erforderlich')
            }

            const user = await prisma.user.findUnique({
              where: { email: credentials.email },
            })

            if (!user) {
              throw new Error('Benutzer nicht gefunden')
            }

            if (!user.password) {
              throw new Error('Dieser Account verwendet SSO-Authentifizierung')
            }

            const isPasswordValid = await bcrypt.compare(
              credentials.password,
              user.password
            )

            if (!isPasswordValid) {
              throw new Error('Ungültiges Passwort')
            }

            // TOTP-Prüfung wenn aktiviert
            if (user.totpEnabled && user.totpSecret) {
              if (!credentials.totpCode) {
                throw new Error('TOTP_REQUIRED')
              }

              const isValidToken = authenticator.verify({
                token: credentials.totpCode,
                secret: user.totpSecret,
              })

              if (!isValidToken) {
                throw new Error('Ungültiger TOTP-Code')
              }
            }

            return {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
              totpEnabled: user.totpEnabled,
            }
          },
        }),
      ],
  callbacks: {
    async signIn({ user, account }) {
      // Handle OIDC user creation/update on first login
      if (account?.provider === 'oidc' && user.email) {
        let dbUser = await prisma.user.findUnique({
          where: { email: user.email },
        })

        if (!dbUser) {
          // First OIDC login - create user
          const superadminEmail = process.env.OIDC_SUPERADMIN_EMAIL?.toLowerCase()
          const userEmail = user.email.toLowerCase()
          const isFirstLoginAsSuperadmin = superadminEmail === userEmail

          dbUser = await prisma.user.create({
            data: {
              email: user.email,
              name: user.name || user.email,
              password: null, // OIDC users don't have passwords
              role: isFirstLoginAsSuperadmin ? 'SUPER_ADMIN' : 'EMPLOYEE',
              totpEnabled: false,
            },
          })
        } else {
          // Existing user - ensure superadmin email always has SUPER_ADMIN role
          const superadminEmail = process.env.OIDC_SUPERADMIN_EMAIL?.toLowerCase()
          const userEmail = user.email.toLowerCase()
          if (superadminEmail === userEmail && dbUser.role !== 'SUPER_ADMIN') {
            await prisma.user.update({
              where: { id: dbUser.id },
              data: { role: 'SUPER_ADMIN' },
            })
            dbUser.role = 'SUPER_ADMIN'
          }
        }

        // Update user object with DB data
        user.id = dbUser.id
        user.role = dbUser.role
        user.totpEnabled = dbUser.totpEnabled
      }

      return true
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }

      // For OIDC users, fetch fresh role from DB
      if (account?.provider === 'oidc' && user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
        })
        if (dbUser) {
          token.id = dbUser.id
          token.role = dbUser.role
          token.totpEnabled = false
        }
      }

      // For credentials users, set TOTP flag
      if (account?.provider === 'credentials') {
        token.totpEnabled = user?.totpEnabled ?? false
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.totpEnabled = token.totpEnabled as boolean
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 Stunden
  },
  secret: process.env.NEXTAUTH_SECRET,
}
