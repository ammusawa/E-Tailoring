import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { query } from '@/lib/db'
import { generateId } from '@/lib/utils'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z.string().min(1).optional(),
  basePrice: z.number().positive().optional(),
  imageUrl: z.string().url().optional().nullable(),
  imageData: z.string().optional().nullable(),
  imagesData: z.array(z.string()).optional(), // Array of base64 images
  isActive: z.boolean().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()

    if (user.role !== 'TAILOR') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const data = updateSchema.parse(body)

    const fields: string[] = []
    const values: any[] = []
    let imageHandled = false

    Object.entries(data).forEach(([key, value]) => {
      if (value === undefined) return

      // Skip imagesData - it's handled separately
      if (key === 'imagesData') {
        return
      }

      if (key === 'imageUrl' || key === 'imageData') {
        if (imageHandled) return
        imageHandled = true
        const imageValue = (data.imageData ?? data.imageUrl) ?? null
        fields.push('imageUrl = ?')
        values.push(imageValue)
        return
      }

      fields.push(`${key} = ?`)
      values.push(value)
    })

    // Only update styles table if there are fields to update
    // (imagesData is handled separately)
    if (fields.length > 0) {
      values.push(user.id, params.id)

      await query(
        `UPDATE styles 
         SET ${fields.join(', ')}
         WHERE tailorId = ? AND id = ?`,
        values
      )
    }

    // Handle multiple images update
    if (data.imagesData !== undefined) {
      // Delete existing images
      await query('DELETE FROM style_images WHERE styleId = ?', [params.id])
      
      // Insert new images
      if (data.imagesData.length > 0) {
        for (let i = 0; i < data.imagesData.length; i++) {
          const imageId = generateId()
          await query(
            `INSERT INTO style_images (id, styleId, imageUrl, displayOrder)
             VALUES (?, ?, ?, ?)`,
            [imageId, params.id, data.imagesData[i], i]
          )
        }
        
        // Update main imageUrl to first image for backward compatibility
        await query(
          'UPDATE styles SET imageUrl = ? WHERE id = ?',
          [data.imagesData[0], params.id]
        )
      }
    }

    return NextResponse.json({ message: 'Design updated' })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.error('Error updating design:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()

    if (user.role !== 'TAILOR') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    await query(
      'DELETE FROM styles WHERE id = ? AND tailorId = ?',
      [params.id, user.id]
    )

    return NextResponse.json({ message: 'Design deleted' })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.error('Error deleting design:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

