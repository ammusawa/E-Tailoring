import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '12')
    const onlyTailorDesigns = searchParams.get('onlyTailorDesigns') === 'true'
    const tailorId = searchParams.get('tailorId')

    // Set GROUP_CONCAT max length to handle large base64 images
    await query(`SET SESSION group_concat_max_len = 4294967295`)
    
    let whereClause = 'WHERE s.isActive = TRUE'
    const queryParams: any[] = []
    
    if (tailorId) {
      whereClause += ' AND s.tailorId = ?'
      queryParams.push(tailorId)
    } else if (onlyTailorDesigns) {
      whereClause += ' AND s.tailorId IS NOT NULL'
    }
    
    queryParams.push(limit)
    
    const styles = await query(
      `SELECT s.*, 
              t.id as tailorUserId,
              t.firstName as tailorFirstName,
              t.lastName as tailorLastName,
              tp.rating as tailorRating,
              tp.bio as tailorBio,
              tp.experience as tailorExperience,
              COALESCE(GROUP_CONCAT(si.id ORDER BY si.displayOrder, si.createdAt SEPARATOR '|||'), '') as imageIds,
              COALESCE(GROUP_CONCAT(si.imageUrl ORDER BY si.displayOrder, si.createdAt SEPARATOR '|||'), '') as imageUrls
       FROM styles s
       LEFT JOIN users t ON s.tailorId = t.id
       LEFT JOIN tailor_profiles tp ON t.id = tp.userId
       LEFT JOIN style_images si ON s.id = si.styleId
       ${whereClause}
       GROUP BY s.id
       ORDER BY s.createdAt DESC
       LIMIT ?`,
      queryParams
    )

    const platformStyles: any[] = []
    const tailorDesigns: any[] = []

    styles.forEach((style: any) => {
      // Get images from style_images table
      let imageUrls: string[] = []
      let imageIds: string[] = []
      
      if (style.imageUrls && style.imageUrls.trim() !== '') {
        // Use custom separator to avoid issues with base64 containing commas
        const urls = style.imageUrls.split('|||').filter((url: string) => url && url.trim() !== '')
        const ids = (style.imageIds && style.imageIds.trim() !== '') 
          ? style.imageIds.split('|||').filter((id: string) => id && id.trim() !== '') 
          : []
        imageUrls = urls
        imageIds = ids
      }
      
      // If no images in style_images table, check old imageUrl field (backward compatibility)
      if (imageUrls.length === 0 && style.imageUrl && style.imageUrl.trim() !== '') {
        imageUrls = [style.imageUrl]
        imageIds = [null]
      }
      
      // For backward compatibility, use first image as imageUrl
      const imageUrl = imageUrls.length > 0 ? imageUrls[0] : (style.imageUrl && style.imageUrl.trim() !== '' ? style.imageUrl : null)

      const formattedStyle = {
        id: style.id,
        name: style.name,
        description: style.description,
        category: style.category,
        imageUrl: imageUrl,
        images: imageUrls.map((url: string, index: number) => ({
          id: imageIds[index] || null,
          url: url,
          displayOrder: index,
        })),
        basePrice: parseFloat(style.basePrice),
        isActive: !!style.isActive,
        createdAt: style.createdAt,
        updatedAt: style.updatedAt,
        tailor: style.tailorUserId
          ? {
              id: style.tailorUserId,
              firstName: style.tailorFirstName,
              lastName: style.tailorLastName,
              rating: style.tailorRating ?? 0,
              bio: style.tailorBio,
              experience: style.tailorExperience,
            }
          : null,
      }

      if (style.tailorUserId) {
        tailorDesigns.push(formattedStyle)
      } else {
        platformStyles.push(formattedStyle)
      }
    })

    return NextResponse.json({ platformStyles, tailorDesigns })
  } catch (error) {
    console.error('Error fetching styles:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
