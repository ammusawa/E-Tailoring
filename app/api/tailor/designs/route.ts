import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { query } from '@/lib/db'
import { generateId } from '@/lib/utils'
import { z } from 'zod'

const designSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().min(1),
  basePrice: z.number().positive(),
  imageUrl: z.string().url().optional(),
  imageData: z.string().optional(),
  imagesData: z.array(z.string()).optional(), // Array of base64 images
  isActive: z.boolean().optional(),
})

export async function GET() {
  try {
    const user = await requireAuth()

    if (user.role !== 'TAILOR') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Set GROUP_CONCAT max length to handle large base64 images
    await query(`SET SESSION group_concat_max_len = 4294967295`)
    
    const designs = await query(
      `SELECT s.*, 
              COALESCE(GROUP_CONCAT(si.id ORDER BY si.displayOrder, si.createdAt SEPARATOR '|||'), '') as imageIds,
              COALESCE(GROUP_CONCAT(si.imageUrl ORDER BY si.displayOrder, si.createdAt SEPARATOR '|||'), '') as imageUrls
       FROM styles s
       LEFT JOIN style_images si ON s.id = si.styleId
       WHERE s.tailorId = ? 
       GROUP BY s.id
       ORDER BY s.createdAt DESC`,
      [user.id]
    )

    const formatted = designs.map((design: any) => {
      // Get images from style_images table
      let imageUrls: string[] = []
      let imageIds: string[] = []
      
      // GROUP_CONCAT returns empty string if no matches, or separator-separated values
      if (design.imageUrls && design.imageUrls.trim() !== '') {
        // Use custom separator to avoid issues with base64 containing commas
        const urls = design.imageUrls.split('|||').filter((url: string) => url && url.trim() !== '')
        const ids = (design.imageIds && design.imageIds.trim() !== '') 
          ? design.imageIds.split('|||').filter((id: string) => id && id.trim() !== '') 
          : []
        imageUrls = urls
        imageIds = ids
      }
      
      // If no images in style_images table, check old imageUrl field (backward compatibility)
      if (imageUrls.length === 0 && design.imageUrl && design.imageUrl.trim() !== '') {
        imageUrls = [design.imageUrl]
        imageIds = [null]
      }
      
      // For backward compatibility, use first image as imageUrl
      const imageUrl = imageUrls.length > 0 ? imageUrls[0] : (design.imageUrl && design.imageUrl.trim() !== '' ? design.imageUrl : null)
      
      return {
        id: design.id,
        name: design.name,
        description: design.description,
        category: design.category,
        imageUrl: imageUrl, // First image for backward compatibility
        images: imageUrls.map((url: string, index: number) => ({
          id: imageIds[index] || null,
          url: url,
          displayOrder: index,
        })),
        basePrice: parseFloat(design.basePrice),
        isActive: !!design.isActive,
        createdAt: design.createdAt,
        updatedAt: design.updatedAt,
      }
    })

    return NextResponse.json({ designs: formatted })
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.error('Error fetching designs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()

    if (user.role !== 'TAILOR') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const data = designSchema.parse(body)

    const designId = generateId()
    
    // Use first image for backward compatibility (imageUrl field)
    const firstImage = data.imagesData && data.imagesData.length > 0 
      ? data.imagesData[0] 
      : (data.imageData || data.imageUrl || null)
    
    await query(
      `INSERT INTO styles (id, tailorId, name, description, category, imageUrl, basePrice, isActive)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        designId,
        user.id,
        data.name,
        data.description || null,
        data.category,
        firstImage,
        data.basePrice,
        data.isActive ?? true,
      ]
    )

    // Insert multiple images into style_images table
    const imagesToInsert = data.imagesData || (data.imageData ? [data.imageData] : [])
    
    if (imagesToInsert.length > 0) {
      for (let i = 0; i < imagesToInsert.length; i++) {
        const imageId = generateId()
        await query(
          `INSERT INTO style_images (id, styleId, imageUrl, displayOrder)
           VALUES (?, ?, ?, ?)`,
          [imageId, designId, imagesToInsert[i], i]
        )
      }
    }

    // Fetch the created design with images
    const createdDesigns = await query(
      `SELECT s.*, 
              COALESCE(GROUP_CONCAT(si.id ORDER BY si.displayOrder, si.createdAt), '') as imageIds,
              COALESCE(GROUP_CONCAT(si.imageUrl ORDER BY si.displayOrder, si.createdAt), '') as imageUrls
       FROM styles s
       LEFT JOIN style_images si ON s.id = si.styleId
       WHERE s.id = ?
       GROUP BY s.id`,
      [designId]
    )
    
    const createdDesign = createdDesigns.length > 0 ? createdDesigns[0] : null

    const imageUrls = (createdDesign?.imageUrls && createdDesign.imageUrls.trim() !== '') 
      ? createdDesign.imageUrls.split('|||').filter((url: string) => url && url.trim() !== '') 
      : []
    const imageIds = (createdDesign?.imageIds && createdDesign.imageIds.trim() !== '') 
      ? createdDesign.imageIds.split('|||').filter((id: string) => id && id.trim() !== '') 
      : []

    return NextResponse.json(
      {
        design: {
          id: designId,
          name: data.name,
          description: data.description,
          category: data.category,
          imageUrl: imageUrls.length > 0 ? imageUrls[0] : null,
          images: imageUrls.map((url: string, index: number) => ({
            id: imageIds[index] || null,
            url: url,
            displayOrder: index,
          })),
          basePrice: data.basePrice,
          isActive: data.isActive ?? true,
        },
      },
      { status: 201 }
    )
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

    console.error('Error creating design:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

