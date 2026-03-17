import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { query, queryOne } from '@/lib/db'
import { z } from 'zod'

const profileSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  tailor: z
    .object({
      bio: z.string().optional().nullable(),
      experience: z.number().int().min(0).optional().nullable(),
      bankName: z.string().optional().nullable(),
      accountName: z.string().optional().nullable(),
      accountNumber: z.string().optional().nullable(),
    })
    .optional(),
})

export async function GET() {
  try {
    const authUser = await requireAuth()

    const profile = await queryOne(
      `SELECT u.id, u.email, u.firstName, u.lastName, u.phone, u.address, u.role,
              tp.bio, tp.experience, tp.rating, tp.totalOrders, tp.completedOrders,
              tp.bankName, tp.accountName, tp.accountNumber
       FROM users u
       LEFT JOIN tailor_profiles tp ON u.id = tp.userId
       WHERE u.id = ?`,
      [authUser.id]
    )

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    return NextResponse.json({
      profile: {
        id: profile.id,
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
        address: profile.address,
        role: profile.role,
        tailor:
          profile.role === 'TAILOR'
            ? {
                bio: profile.bio,
                experience: profile.experience,
                rating: profile.rating ? parseFloat(profile.rating) : null,
                totalOrders: profile.totalOrders,
                completedOrders: profile.completedOrders,
                bankName: profile.bankName,
                accountName: profile.accountName,
                accountNumber: profile.accountNumber,
              }
            : null,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authUser = await requireAuth()
    const body = await request.json()
    const data = profileSchema.parse(body)

    await query(
      `UPDATE users
       SET firstName = ?, lastName = ?, phone = ?, address = ?
       WHERE id = ?`,
      [data.firstName, data.lastName, data.phone || null, data.address || null, authUser.id]
    )

    if (authUser.role === 'TAILOR' && data.tailor) {
      await query(
        `UPDATE tailor_profiles
         SET bio = ?, experience = ?, bankName = ?, accountName = ?, accountNumber = ?, updatedAt = NOW()
         WHERE userId = ?`,
        [
          data.tailor.bio || null,
          data.tailor.experience || null,
          data.tailor.bankName || null,
          data.tailor.accountName || null,
          data.tailor.accountNumber || null,
          authUser.id,
        ]
      )
    }

    return NextResponse.json({ message: 'Profile updated successfully' })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    if ((error as Error).message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.error('Profile update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

