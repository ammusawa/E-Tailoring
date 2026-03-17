'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/components/layout/navbar'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { ShoppingCart, ArrowLeft, Star } from 'lucide-react'
import toast from 'react-hot-toast'

interface DesignImage {
  id?: string | null
  url: string
  displayOrder: number
}

interface Design {
  id: string
  name: string
  description?: string | null
  category: string
  imageUrl?: string | null
  images?: DesignImage[]
  basePrice: number
}

interface TailorInfo {
  id: string
  firstName: string
  lastName: string
  rating: number
  bio?: string | null
  experience?: number | null
}

// Helper function to normalize image URLs
const normalizeImageUrl = (url: string | null | undefined): string | null => {
  if (!url || url.trim() === '') return null
  
  if (url.startsWith('data:')) {
    if (url.includes(';base64,') && url.length > 20) {
      return url
    }
    if (url.includes(';base64:') || url.includes(';base64')) {
      const parts = url.split(';base64')
      if (parts.length > 1) {
        const base64Part = parts[1].replace(':', ',').replace(/^,/, '')
        const mimeType = url.match(/data:([^;]+)/)?.[1] || 'image/jpeg'
        return `data:${mimeType};base64,${base64Part}`
      }
    }
    return null
  }
  
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  
  const isBase64 = 
    url.startsWith('/9j/') || 
    url.startsWith('iVBORw0KGgo') || 
    url.startsWith('R0lGODlh') || 
    url.startsWith('R0lGODdh') ||
    (url.length > 100 && url.match(/^[A-Za-z0-9+/=\s]+$/))
  
  if (isBase64) {
    let mimeType = 'image/jpeg'
    if (url.startsWith('iVBORw0KGgo')) {
      mimeType = 'image/png'
    } else if (url.startsWith('R0lGODlh') || url.startsWith('R0lGODdh')) {
      mimeType = 'image/gif'
    } else if (url.startsWith('/9j/')) {
      mimeType = 'image/jpeg'
    }
    const cleanBase64 = url.trim().replace(/\s/g, '')
    if (cleanBase64.length > 50) {
      return `data:${mimeType};base64,${cleanBase64}`
    }
  }
  
  return null
}

export default function TailorStorePage() {
  const params = useParams()
  const tailorId = params.id as string
  const [designs, setDesigns] = useState<Design[]>([])
  const [tailorInfo, setTailorInfo] = useState<TailorInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (tailorId) {
      fetchTailorData()
    }
  }, [tailorId])

  const fetchTailorData = async () => {
    try {
      const res = await fetch(`/api/styles?tailorId=${tailorId}`)
      if (res.ok) {
        const data = await res.json()
        const tailorDesigns = data.tailorDesigns || []
        setDesigns(tailorDesigns)
        
        // Get tailor info from first design (all designs from same tailor will have same info)
        if (tailorDesigns.length > 0 && tailorDesigns[0].tailor) {
          const tailor = tailorDesigns[0].tailor
          setTailorInfo({
            id: tailor.id,
            firstName: tailor.firstName,
            lastName: tailor.lastName,
            rating: tailor.rating || 0,
            bio: tailor.bio || null,
            experience: tailor.experience || null,
          })
        } else {
          // If no designs, try to fetch tailor info separately
          // For now, just show empty state
        }
      } else {
        toast.error('Failed to load tailor designs')
      }
    } catch (error) {
      toast.error('Failed to load tailor designs')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/customer/designs" className="inline-flex items-center text-primary-600 hover:underline mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to All Designs
        </Link>

        {/* Tailor Info */}
        {tailorInfo && (
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold mb-2">
                    {tailorInfo.firstName} {tailorInfo.lastName}
                  </h1>
                  {tailorInfo.rating > 0 && (
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                      <span className="text-lg font-semibold">{tailorInfo.rating.toFixed(1)}</span>
                    </div>
                  )}
                  {tailorInfo.experience && (
                    <p className="text-gray-600 mb-2">
                      {tailorInfo.experience} {tailorInfo.experience === 1 ? 'year' : 'years'} of experience
                    </p>
                  )}
                  {tailorInfo.bio && (
                    <p className="text-gray-700">{tailorInfo.bio}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Designs */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-4">
            Designs by {tailorInfo ? `${tailorInfo.firstName} ${tailorInfo.lastName}` : 'This Tailor'}
          </h2>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-600">Loading designs...</div>
        ) : designs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600">No designs available from this tailor yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {designs.map((design) => {
              const imageUrl = design.images && design.images.length > 0 
                ? design.images[0].url 
                : design.imageUrl
              const normalizedUrl = normalizeImageUrl(imageUrl)
              
              return (
                <Card
                  key={design.id}
                  className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                >
                  {normalizedUrl ? (
                    <div className="relative h-64">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={normalizedUrl}
                        alt={design.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="h-64 bg-gray-200 flex items-center justify-center text-gray-400">
                      No image
                    </div>
                  )}
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">{design.name}</h3>
                      <span className="text-sm font-bold text-primary-600 whitespace-nowrap ml-2">
                        {formatCurrency(design.basePrice)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mb-2">{design.category}</p>
                    {design.description && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {design.description}
                      </p>
                    )}
                    <Link href={`/customer/orders/new?designId=${design.id}`}>
                      <Button className="w-full" size="sm">
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        Order This Design
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

