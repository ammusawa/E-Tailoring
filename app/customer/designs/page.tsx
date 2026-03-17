'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Navbar } from '@/components/layout/navbar'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/utils'
import { Search, ShoppingCart } from 'lucide-react'
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
  tailor?: {
    id: string
    firstName: string
    lastName: string
    rating: number
    bio?: string | null
    experience?: number | null
  } | null
}

// Helper function to normalize image URLs (handle base64 with or without prefix)
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

export default function CustomerDesignsPage() {
  const [designs, setDesigns] = useState<Design[]>([])
  const [filteredDesigns, setFilteredDesigns] = useState<Design[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  const categories = [
    'All Categories',
    'Shirt',
    'Trouser',
    'Dress',
    'Suit',
    'Traditional',
    'Casual',
    'Event',
  ]

  useEffect(() => {
    fetchDesigns()
  }, [])

  useEffect(() => {
    filterDesigns()
  }, [designs, searchTerm, categoryFilter])

  const fetchDesigns = async () => {
    try {
      const res = await fetch('/api/styles?onlyTailorDesigns=true')
      if (res.ok) {
        const data = await res.json()
        setDesigns(data.tailorDesigns || [])
      } else {
        toast.error('Failed to load designs')
      }
    } catch (error) {
      toast.error('Failed to load designs')
    } finally {
      setLoading(false)
    }
  }

  const filterDesigns = () => {
    let filtered = designs

    if (searchTerm) {
      filtered = filtered.filter(
        (design) =>
          design.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          design.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          design.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
          `${design.tailor?.firstName} ${design.tailor?.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (categoryFilter && categoryFilter !== 'All Categories') {
      filtered = filtered.filter((design) => design.category === categoryFilter)
    }

    setFilteredDesigns(filtered)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Browse Designs</h1>
          <p className="text-gray-600">Explore designs from our talented tailors</p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search designs, tailors, or categories..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                >
                  {categories.map((category) => (
                    <option key={category} value={category === 'All Categories' ? '' : category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Designs Grid */}
        {loading ? (
          <div className="text-center py-12 text-gray-600">Loading designs...</div>
        ) : filteredDesigns.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600">
                {searchTerm || categoryFilter ? 'No designs match your search' : 'No designs available yet'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredDesigns.map((design) => {
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
                        {design.tailor && (
                          <Link 
                            href={`/customer/tailors/${design.tailor.id}`}
                            className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 font-medium mb-2 transition-all duration-200 hover:bg-primary-50 px-2 py-1 rounded-md -ml-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span>by</span>
                            <span className="font-semibold">{design.tailor.firstName} {design.tailor.lastName}</span>
                            {design.tailor.rating > 0 && (
                              <span className="ml-1 flex items-center gap-0.5">
                                <span>⭐</span>
                                <span>{design.tailor.rating.toFixed(1)}</span>
                              </span>
                            )}
                          </Link>
                        )}
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

