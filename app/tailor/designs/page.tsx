'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Navbar } from '@/components/layout/navbar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { formatCurrency } from '@/lib/utils'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'

interface DesignImage {
  id?: string | null
  url: string
  displayOrder: number
}

interface TailorDesign {
  id: string
  name: string
  description?: string | null
  category: string
  imageUrl?: string | null
  images?: DesignImage[]
  basePrice: number
  isActive: boolean
  createdAt: string
}

const categories = [
  'Shirt',
  'Trouser',
  'Dress',
  'Suit',
  'Traditional',
  'Casual',
  'Event',
]

const sampleDesigns = [
  { label: 'Select sample', value: '' },
  { label: 'Lagos Gala Dress', value: 'Lagos Gala Dress' },
  { label: 'Aso-ebi Kaftan', value: 'Aso-ebi Kaftan' },
  { label: 'Corporate Power Suit', value: 'Corporate Power Suit' },
  { label: 'Ankara Fusion', value: 'Ankara Fusion' },
  { label: 'Other (enter manually)', value: 'OTHER' },
]

// Helper function to normalize image URLs (handle base64 with or without prefix)
const normalizeImageUrl = (url: string | null | undefined): string | null => {
  if (!url) return null
  
  // If it already starts with data:, return as is
  if (url.startsWith('data:')) {
    return url
  }
  
  // If it's a regular HTTP/HTTPS URL, return as is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  
  // Check if it looks like base64 (common base64 image patterns)
  // JPEG base64 typically starts with /9j/4AAQ or /9j/
  // PNG base64 starts with iVBORw0KGgo
  // GIF base64 starts with R0lGODlh or R0lGODdh
  const isBase64 = 
    url.startsWith('/9j/') || 
    url.startsWith('iVBORw0KGgo') || 
    url.startsWith('R0lGODlh') || 
    url.startsWith('R0lGODdh') ||
    (url.length > 100 && url.match(/^[A-Za-z0-9+/=\s]+$/))
  
  if (isBase64) {
    // Try to detect image type from first few characters
    let mimeType = 'image/jpeg' // default
    if (url.startsWith('iVBORw0KGgo')) {
      mimeType = 'image/png'
    } else if (url.startsWith('R0lGODlh') || url.startsWith('R0lGODdh')) {
      mimeType = 'image/gif'
    } else if (url.startsWith('/9j/')) {
      mimeType = 'image/jpeg'
    }
    // Remove any whitespace and ensure proper format
    const cleanBase64 = url.trim().replace(/\s/g, '')
    return `data:${mimeType};base64,${cleanBase64}`
  }
  
  // If it's a relative path or unknown format, return as is (might be a broken URL)
  return url
}

export default function TailorDesignsPage() {
  const [designs, setDesigns] = useState<TailorDesign[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newDesign, setNewDesign] = useState({
    sample: '',
    name: '',
    description: '',
    category: categories[0],
    basePrice: '',
  })
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [viewingImage, setViewingImage] = useState<string | null>(null)
  const [viewingImageIndex, setViewingImageIndex] = useState<number>(0)
  const [viewingDesignImages, setViewingDesignImages] = useState<string[]>([])
  const [editingDesign, setEditingDesign] = useState<TailorDesign | null>(null)
  const [editForm, setEditForm] = useState({
    sample: '',
    name: '',
    description: '',
    category: categories[0],
    basePrice: '',
  })
  const [editImagePreviews, setEditImagePreviews] = useState<string[]>([])
  const [editImageFiles, setEditImageFiles] = useState<File[]>([])

  useEffect(() => {
    fetchDesigns()
  }, [])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && viewingImage) {
        setViewingImage(null)
        setViewingDesignImages([])
      }
    }

    const handleArrowKeys = (e: KeyboardEvent) => {
      if (!viewingImage || viewingDesignImages.length === 0) return
      
      if (e.key === 'ArrowLeft') {
        setViewingImageIndex((prev) => {
          const newIndex = prev > 0 ? prev - 1 : viewingDesignImages.length - 1
          setViewingImage(viewingDesignImages[newIndex])
          return newIndex
        })
      } else if (e.key === 'ArrowRight') {
        setViewingImageIndex((prev) => {
          const newIndex = prev < viewingDesignImages.length - 1 ? prev + 1 : 0
          setViewingImage(viewingDesignImages[newIndex])
          return newIndex
        })
      }
    }

    if (viewingImage) {
      document.addEventListener('keydown', handleEscape)
      document.addEventListener('keydown', handleArrowKeys)
      document.body.style.overflow = 'hidden' // Prevent background scrolling
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('keydown', handleArrowKeys)
      document.body.style.overflow = 'unset'
    }
  }, [viewingImage, viewingDesignImages])

  const fetchDesigns = async () => {
    try {
      const res = await fetch('/api/tailor/designs')
      if (res.ok) {
        const data = await res.json()
        setDesigns(data.designs || [])
      } else {
        toast.error('Failed to load designs')
      }
    } catch (error) {
      toast.error('Failed to load designs')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateDesign = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
    const res = await fetch('/api/tailor/designs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newDesign,
        basePrice: parseFloat(newDesign.basePrice),
        imagesData: imagePreviews.length > 0 ? imagePreviews : undefined,
      }),
    })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create design')
      }

      toast.success('Design created')
      setNewDesign({
        sample: '',
        name: '',
        description: '',
        category: categories[0],
        basePrice: '',
      })
      setImagePreviews([])
      setImageFiles([])
      fetchDesigns()
    } catch (error: any) {
      toast.error(error.message || 'Failed to create design')
    } finally {
      setSaving(false)
    }
  }

  const toggleDesignStatus = async (design: TailorDesign) => {
    try {
      const res = await fetch(`/api/tailor/designs/${design.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !design.isActive }),
      })

      if (!res.ok) throw new Error('Failed to update design')

      toast.success(`Design ${design.isActive ? 'disabled' : 'activated'}`)
      fetchDesigns()
    } catch (error) {
      toast.error('Failed to update design')
    }
  }

  const deleteDesign = async (designId: string) => {
    try {
      const res = await fetch(`/api/tailor/designs/${designId}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Failed to delete design')

      toast.success('Design deleted')
      fetchDesigns()
    } catch (error) {
      toast.error('Failed to delete design')
    }
  }

  const startEditing = (design: TailorDesign) => {
    setEditingDesign(design)
    
    // Check if design name matches a sample design
    const matchingSample = sampleDesigns.find(s => s.value === design.name)
    
    setEditForm({
      sample: matchingSample ? matchingSample.value : 'OTHER',
      name: design.name,
      description: design.description || '',
      category: design.category,
      basePrice: design.basePrice.toString(),
    })
    // Load existing images
    if (design.images && design.images.length > 0) {
      setEditImagePreviews(design.images.map(img => img.url))
    } else if (design.imageUrl) {
      setEditImagePreviews([design.imageUrl])
    } else {
      setEditImagePreviews([])
    }
    setEditImageFiles([])
  }

  const cancelEditing = () => {
    setEditingDesign(null)
    setEditForm({
      sample: '',
      name: '',
      description: '',
      category: categories[0],
      basePrice: '',
    })
    setEditImagePreviews([])
    setEditImageFiles([])
  }

  const handleUpdateDesign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingDesign) return

    setSaving(true)
    try {
      const res = await fetch(`/api/tailor/designs/${editingDesign.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          description: editForm.description || null,
          category: editForm.category,
          basePrice: parseFloat(editForm.basePrice),
          imagesData: editImagePreviews.length > 0 ? editImagePreviews : undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update design')
      }

      toast.success('Design updated')
      cancelEditing()
      fetchDesigns()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update design')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">My Designs</h1>
            <p className="text-gray-600">Showcase your best work for customers to order</p>
          </div>
        </div>

        {/* Create Design */}
        <Card>
          <CardHeader>
            <CardTitle>Add New Design</CardTitle>
            <CardDescription>Upload your signature looks for customers</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateDesign} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Sample Design</label>
                  <select
                    className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                    value={newDesign.sample}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value && value !== 'OTHER') {
                        setNewDesign({
                          ...newDesign,
                          sample: value,
                          name: value,
                        })
                      } else {
                        setNewDesign({
                          ...newDesign,
                          sample: value,
                          name: '',
                        })
                      }
                    }}
                  >
                    {sampleDesigns.map((design) => (
                      <option key={design.value || 'empty'} value={design.value}>
                        {design.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {newDesign.sample && newDesign.sample !== 'OTHER' ? 'Custom Design Name (optional)' : 'Design Name *'}
                  </label>
                  <Input
                    value={newDesign.name}
                    onChange={(e) => setNewDesign({ ...newDesign, name: e.target.value })}
                    required={!newDesign.sample || newDesign.sample === 'OTHER'}
                    placeholder="Describe your design"
                    disabled={newDesign.sample && newDesign.sample !== 'OTHER'}
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Category *</label>
                  <select
                    className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                    value={newDesign.category}
                    onChange={(e) => setNewDesign({ ...newDesign, category: e.target.value })}
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Base Price (NGN) *</label>
                  <Input
                    type="number"
                    min="0"
                    step="1000"
                    value={newDesign.basePrice}
                    onChange={(e) => setNewDesign({ ...newDesign, basePrice: e.target.value })}
                    required
                    placeholder="e.g. 25000"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Design Images</label>
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || [])
                    if (files.length === 0) {
                      setImagePreviews([])
                      setImageFiles([])
                      return
                    }
                    
                    // Validate file sizes
                    const validFiles = files.filter(file => {
                      if (file.size > 5 * 1024 * 1024) {
                        toast.error(`${file.name} is too large (max 5MB)`)
                        return false
                      }
                      return true
                    })
                    
                    setImageFiles(validFiles)
                    
                    // Read all files as base64
                    const readers = validFiles.map(file => {
                      return new Promise<string>((resolve) => {
                        const reader = new FileReader()
                        reader.onloadend = () => {
                          resolve(reader.result as string)
                        }
                        reader.readAsDataURL(file)
                      })
                    })
                    
                    Promise.all(readers).then(previews => {
                      setImagePreviews(previews)
                    })
                  }}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Upload multiple PNG/JPG images (max 5MB each). Customers will see all images.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <Textarea
                  value={newDesign.description}
                  onChange={(e) => setNewDesign({ ...newDesign, description: e.target.value })}
                  placeholder="Share fabric details, inspiration or recommended occasions"
                  rows={3}
                />
              </div>
              {imagePreviews.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    {imagePreviews.length} image{imagePreviews.length > 1 ? 's' : ''} selected
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative border rounded-lg overflow-hidden group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-32 object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newPreviews = imagePreviews.filter((_, i) => i !== index)
                            const newFiles = imageFiles.filter((_, i) => i !== index)
                            setImagePreviews(newPreviews)
                            setImageFiles(newFiles)
                          }}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="Remove image"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
                      <Button
                        type="submit"
                        disabled={saving || imagePreviews.length === 0}
                      >
                        {saving ? 'Saving...' : 'Add Design'}
                      </Button>
            </form>
          </CardContent>
        </Card>

        {/* Existing Designs */}
        <Card>
          <CardHeader>
            <CardTitle>Uploaded Designs</CardTitle>
            <CardDescription>Manage availability and pricing</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading designs...</div>
            ) : designs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No designs yet. Add your first design above.
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {designs.map((design) => (
                  editingDesign?.id === design.id ? (
                    // Edit Form
                    <Card key={design.id} className="md:col-span-2">
                      <CardHeader>
                        <div className="flex justify-between items-center">
                          <CardTitle>Edit Design</CardTitle>
                          <Button variant="ghost" size="sm" onClick={cancelEditing}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <form onSubmit={handleUpdateDesign} className="space-y-4">
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium mb-1">Sample Design</label>
                              <select
                                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                                value={editForm.sample}
                                onChange={(e) => {
                                  const value = e.target.value
                                  if (value && value !== 'OTHER') {
                                    setEditForm({
                                      ...editForm,
                                      sample: value,
                                      name: value,
                                    })
                                  } else {
                                    setEditForm({
                                      ...editForm,
                                      sample: value,
                                    })
                                  }
                                }}
                              >
                                {sampleDesigns.map((sample) => (
                                  <option key={sample.value || 'empty'} value={sample.value}>
                                    {sample.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-1">
                                {editForm.sample && editForm.sample !== 'OTHER' ? 'Custom Design Name (optional)' : 'Design Name *'}
                              </label>
                              <Input
                                value={editForm.name}
                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                required={!editForm.sample || editForm.sample === 'OTHER'}
                                placeholder="Describe your design"
                                disabled={editForm.sample && editForm.sample !== 'OTHER'}
                              />
                            </div>
                          </div>
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium mb-1">Category *</label>
                              <select
                                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                                value={editForm.category}
                                onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                              >
                                {categories.map((category) => (
                                  <option key={category} value={category}>
                                    {category}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium mb-1">Base Price (NGN) *</label>
                              <Input
                                type="number"
                                min="0"
                                step="1000"
                                value={editForm.basePrice}
                                onChange={(e) => setEditForm({ ...editForm, basePrice: e.target.value })}
                                required
                                placeholder="e.g. 25000"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Design Images</label>
                            <Input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={(e) => {
                                const files = Array.from(e.target.files || [])
                                if (files.length === 0) return
                                
                                const validFiles = files.filter(file => {
                                  if (file.size > 5 * 1024 * 1024) {
                                    toast.error(`${file.name} is too large (max 5MB)`)
                                    return false
                                  }
                                  return true
                                })
                                
                                const newFiles = [...editImageFiles, ...validFiles]
                                setEditImageFiles(newFiles)
                                
                                const readers = validFiles.map(file => {
                                  return new Promise<string>((resolve) => {
                                    const reader = new FileReader()
                                    reader.onloadend = () => {
                                      resolve(reader.result as string)
                                    }
                                    reader.readAsDataURL(file)
                                  })
                                })
                                
                                Promise.all(readers).then(newPreviews => {
                                  setEditImagePreviews([...editImagePreviews, ...newPreviews])
                                })
                              }}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Add more images (max 5MB each)
                            </p>
                          </div>
                          {editImagePreviews.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-sm text-gray-600">
                                {editImagePreviews.length} image{editImagePreviews.length > 1 ? 's' : ''}
                              </p>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {editImagePreviews.map((preview, index) => (
                                  <div key={index} className="relative border rounded-lg overflow-hidden group">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={preview}
                                      alt={`Preview ${index + 1}`}
                                      className="w-full h-32 object-cover"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newPreviews = editImagePreviews.filter((_, i) => i !== index)
                                        const newFiles = editImageFiles.filter((_, i) => i !== index)
                                        setEditImagePreviews(newPreviews)
                                        setEditImageFiles(newFiles)
                                      }}
                                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                      aria-label="Remove image"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          <div>
                            <label className="block text-sm font-medium mb-1">Description</label>
                            <Textarea
                              value={editForm.description}
                              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                              placeholder="Share fabric details, inspiration or recommended occasions"
                              rows={3}
                            />
                          </div>
                          <div className="flex gap-2 justify-end">
                            <Button type="button" variant="outline" onClick={cancelEditing}>
                              Cancel
                            </Button>
                            <Button type="submit" disabled={saving || editImagePreviews.length === 0}>
                              {saving ? 'Saving...' : 'Save Changes'}
                            </Button>
                          </div>
                        </form>
                      </CardContent>
                    </Card>
                  ) : (
                  <div key={design.id} className="border rounded-lg overflow-hidden bg-white shadow-sm flex flex-col">
                    {design.images && design.images.length > 0 ? (
                      <div className="relative">
                        <div 
                          className="relative h-48 cursor-pointer group"
                          onClick={() => {
                            const imageUrls = design.images?.map(img => img.url) || [design.imageUrl].filter(Boolean) as string[]
                            setViewingDesignImages(imageUrls)
                            setViewingImageIndex(0)
                            setViewingImage(imageUrls[0])
                          }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={normalizeImageUrl(design.images[0].url) || ''}
                            alt={design.name}
                            className="object-cover w-full h-full transition-opacity group-hover:opacity-90"
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all flex items-center justify-center">
                            <span className="text-white opacity-0 group-hover:opacity-100 text-sm font-medium">
                              {design.images.length > 1 
                                ? `Click to view all ${design.images.length} images`
                                : 'Click to view full size'}
                            </span>
                          </div>
                          {design.images.length > 1 && (
                            <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                              +{design.images.length - 1} more
                            </div>
                          )}
                        </div>
                        {design.images.length > 1 && (
                          <div className="flex gap-1 mt-2 overflow-x-auto pb-2">
                            {design.images.slice(1, 4).map((img, idx) => (
                              <div
                                key={img.id || idx}
                                className="flex-shrink-0 w-16 h-16 border rounded overflow-hidden cursor-pointer hover:opacity-75"
                                onClick={() => {
                                  const imageUrls = design.images?.map(i => i.url) || [design.imageUrl].filter(Boolean) as string[]
                                  const clickedIndex = idx + 1
                                  setViewingDesignImages(imageUrls)
                                  setViewingImageIndex(clickedIndex)
                                  setViewingImage(imageUrls[clickedIndex])
                                }}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={normalizeImageUrl(img.url) || ''}
                                  alt={`${design.name} ${idx + 2}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ))}
                            {design.images.length > 4 && (
                              <div className="flex-shrink-0 w-16 h-16 border rounded flex items-center justify-center text-xs text-gray-500">
                                +{design.images.length - 4}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : design.imageUrl ? (
                      <div 
                        className="relative h-48 cursor-pointer group"
                        onClick={() => {
                          setViewingDesignImages([design.imageUrl!])
                          setViewingImageIndex(0)
                          setViewingImage(design.imageUrl || null)
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={normalizeImageUrl(design.imageUrl) || ''}
                          alt={design.name}
                          className="object-cover w-full h-full transition-opacity group-hover:opacity-90"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all flex items-center justify-center">
                          <span className="text-white opacity-0 group-hover:opacity-100 text-sm font-medium">
                            Click to view full size
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="h-48 bg-gray-100 flex items-center justify-center text-gray-400">
                        No image
                      </div>
                    )}
                    <div className="p-4 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="text-lg font-semibold">{design.name}</h3>
                          <p className="text-sm text-gray-500">{design.category}</p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            design.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {design.isActive ? 'Active' : 'Hidden'}
                        </span>
                      </div>
                      {design.description && (
                        <p className="text-sm text-gray-600 mb-3">{design.description}</p>
                      )}
                      <p className="text-xl font-bold text-primary-600">
                        {formatCurrency(design.basePrice)}
                      </p>
                      <div className="mt-4 flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => startEditing(design)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => toggleDesignStatus(design)}
                        >
                          {design.isActive ? 'Hide' : 'Activate'}
                        </Button>
                        <Button
                          variant="destructive"
                          className="flex-1"
                          onClick={() => deleteDesign(design.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                  )
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Image View Modal */}
      {viewingImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={() => {
            setViewingImage(null)
            setViewingDesignImages([])
          }}
        >
          <div className="relative max-w-7xl max-h-full w-full">
            <button
              onClick={() => {
                setViewingImage(null)
                setViewingDesignImages([])
              }}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors z-10"
              aria-label="Close"
            >
              <X className="h-8 w-8" />
            </button>
            
            {/* Navigation arrows for multiple images */}
            {viewingDesignImages.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    const newIndex = viewingImageIndex > 0 ? viewingImageIndex - 1 : viewingDesignImages.length - 1
                    setViewingImageIndex(newIndex)
                    setViewingImage(viewingDesignImages[newIndex])
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-all z-10"
                  aria-label="Previous image"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    const newIndex = viewingImageIndex < viewingDesignImages.length - 1 ? viewingImageIndex + 1 : 0
                    setViewingImageIndex(newIndex)
                    setViewingImage(viewingDesignImages[newIndex])
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 transition-all z-10"
                  aria-label="Next image"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                
                {/* Image counter */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black bg-opacity-50 text-white px-4 py-2 rounded-full text-sm z-10">
                  {viewingImageIndex + 1} / {viewingDesignImages.length}
                </div>
              </>
            )}
            
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={normalizeImageUrl(viewingImage) || ''}
              alt="Design full view"
              className="max-w-full max-h-[90vh] object-contain rounded-lg mx-auto"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  )
}

