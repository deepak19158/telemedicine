import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { MongoDBAdapter } from '@next-auth/mongodb-adapter'
import { MongoClient } from 'mongodb'
import bcrypt from 'bcryptjs'
import connectDB from './db'

const client = new MongoClient(process.env.MONGO_URI || process.env.MONGODB_URI || '')

export const authOptions: NextAuthOptions = {
  adapter: MongoDBAdapter(client),
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          await connectDB()
          
          // Import User model dynamically to avoid circular dependencies
          const User = require('../server/models/User')
          
          const user = await User.findOne({ email: credentials.email })
          
          if (!user) {
            return null
          }

          const isValidPassword = await bcrypt.compare(
            credentials.password,
            user.password
          )

          if (!isValidPassword) {
            return null
          }

          // Check if email is verified
          if (!user.isVerified) {
            throw new Error('Please verify your email before logging in')
          }

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.profile.name,
            role: user.role,
            isActive: user.isActive,
          }
        } catch (error) {
          console.error('Auth error:', error)
          return null
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
        token.isActive = user.isActive
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub
        session.user.role = token.role as string
        session.user.isActive = token.isActive as boolean
      }
      return session
    }
  },
  pages: {
    signIn: '/login',
    signUp: '/register',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
}

export default authOptions