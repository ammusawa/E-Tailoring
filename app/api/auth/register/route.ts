import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { hashPassword, generateToken } from '@/lib/auth'
import { generateId } from '@/lib/utils'
import { z } from 'zod'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  role: z.enum(['CUSTOMER', 'TAILOR']),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = registerSchema.parse(body)

    // Check if user exists
    const existingUser = await queryOne(
      'SELECT id FROM users WHERE email = ?',
      [data.email]
    )

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await hashPassword(data.password)
    const userId = generateId()

    // Create user
    await query(
      `INSERT INTO users (id, email, password, firstName, lastName, phone, role) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, data.email, hashedPassword, data.firstName, data.lastName, data.phone || null, data.role]
    )

    // Create tailor profile if role is TAILOR
    if (data.role === 'TAILOR') {
      const tailorProfileId = generateId()
      await query(
        `INSERT INTO tailor_profiles (id, userId, bankName, accountName, accountNumber) 
         VALUES (?, ?, NULL, NULL, NULL)`,
        [tailorProfileId, userId]
      )
    }

    // Get created user
    const user = await queryOne(
      `SELECT id, email, firstName, lastName, role 
       FROM users 
       WHERE id = ?`,
      [userId]
    )

    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    })

    const response = NextResponse.json({
      user,
      token,
    })

    // Set cookie
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    return response
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    // Handle database errors specifically
    if (error?.code === 'ECONNREFUSED' || error?.code === 'ER_ACCESS_DENIED_ERROR' || error?.message?.includes('connect') || error?.message?.includes('database')) {
      return NextResponse.json(
        { 
          error: 'Database connection failed',
          message: error.message,
          hint: 'Please ensure your DATABASE_URL is set in .env and the database exists. Run: npm run db:setup'
        },
        { status: 500 }
      )
    }

    console.error('Registration error:', error)
    
    // Provide more detailed error message in development
    const errorMessage = process.env.NODE_ENV === 'development' 
      ? (error?.message || 'Unknown error') 
      : 'Internal server error'
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? (error?.stack || String(error)) : undefined
      },
      { status: 500 }
    )
  }
}
