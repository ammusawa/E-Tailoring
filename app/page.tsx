'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'

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
  
  // Check if it's already a data URL
  if (url.startsWith('data:')) {
    // Validate data URL format - must have comma after base64
    if (url.includes(';base64,') && url.length > 20) {
      return url
    }
    // If malformed data URL (like "data:image/jpeg;base64:1"), try to fix it
    if (url.includes(';base64:') || url.includes(';base64')) {
      // Extract the base64 part after the type
      const parts = url.split(';base64')
      if (parts.length > 1) {
        const base64Part = parts[1].replace(':', ',').replace(/^,/, '')
        const mimeType = url.match(/data:([^;]+)/)?.[1] || 'image/jpeg'
        return `data:${mimeType};base64,${base64Part}`
      }
    }
    return null // Invalid data URL
  }
  
  // Regular HTTP/HTTPS URLs
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  
  // Check if it looks like base64 (common base64 image patterns)
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
    // Only return if we have substantial base64 data
    if (cleanBase64.length > 50) {
      return `data:${mimeType};base64,${cleanBase64}`
    }
  }
  
  return null // Invalid or too short
}

export default function Home() {
  const [designs, setDesigns] = useState<Design[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDesigns()
  }, [])

  const fetchDesigns = async () => {
    try {
      const res = await fetch('/api/styles?onlyTailorDesigns=true&limit=6')
      if (res.ok) {
        const data = await res.json()
        setDesigns(data.tailorDesigns || [])
      }
    } catch (error) {
      console.error('Failed to load designs:', error)
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-primary-600">E-Tailoring</h1>
            </div>
            <div className="flex gap-4">
              <Link href="/auth/login">
                <Button variant="ghost">Login</Button>
              </Link>
              <Link href="/auth/register">
                <Button>Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Custom Clothing Made Easy
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Connect with skilled tailors across Nigeria. Order custom clothing with 
            confidence, track your order in real-time, and chat directly with your tailor.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/auth/register?role=customer">
              <Button size="lg">Order Now</Button>
            </Link>
            <Link href="/auth/register?role=tailor">
              <Button size="lg" variant="outline">Become a Tailor</Button>
            </Link>
          </div>
        </div>

        {/* Featured Designs Section */}
        {designs.length > 0 && (
          <div className="mt-20">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">
              Featured Designs from Our Tailors
            </h2>
            {loading ? (
              <div className="text-center py-12 text-gray-600">Loading designs...</div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {designs.map((design) => {
                  const imageUrl = design.images && design.images.length > 0 
                    ? design.images[0].url 
                    : design.imageUrl
                  const normalizedUrl = normalizeImageUrl(imageUrl)
                  
                  return (
                    <div
                      key={design.id}
                      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
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
                      <div className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{design.name}</h3>
                          <span className="text-sm font-bold text-primary-600">
                            {formatCurrency(design.basePrice)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mb-2">{design.category}</p>
                        {design.tailor && (
                          <Link 
                            href={`/customer/tailors/${design.tailor.id}`}
                            className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 font-medium transition-all duration-200 hover:bg-primary-50 px-2 py-1 rounded-md -ml-2"
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
                          <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                            {design.description}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            {designs.length > 0 && (
              <div className="text-center mt-8">
                <Link href="/auth/register?role=customer">
                  <Button size="lg">View All Designs</Button>
                </Link>
              </div>
            )}
          </div>
        )}

        <div className="mt-20 grid md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-3">Browse Styles</h3>
            <p className="text-gray-600">
              Explore our collection of clothing styles and find the perfect design for you.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-3">Easy Measurements</h3>
            <p className="text-gray-600">
              Our guided measurement system ensures accurate sizing for the perfect fit.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-3">Track Orders</h3>
            <p className="text-gray-600">
              Real-time order tracking keeps you updated on your clothing from start to finish.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

