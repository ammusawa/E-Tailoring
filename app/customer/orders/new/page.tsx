'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Navbar } from '@/components/layout/navbar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { formatCurrency } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Style {
  id: string
  name: string
  description: string | null
  category: string
  basePrice: number
  imageUrl: string | null
  tailor?: {
    id: string
    firstName: string
    lastName: string
    rating?: number
  } | null
}

const categories = ['Shirt', 'Trouser', 'Dress', 'Suit', 'Traditional', 'Casual', 'Event']

export default function NewOrderPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [platformStyles, setPlatformStyles] = useState<Style[]>([])
  const [tailorDesigns, setTailorDesigns] = useState<Style[]>([])
  const [selectedStyle, setSelectedStyle] = useState<Style | null>(null)
  const [orderMode, setOrderMode] = useState<'catalog' | 'custom'>('catalog')
  const [loading, setLoading] = useState(false)
  const [stylesLoading, setStylesLoading] = useState(true)
  const [autoSelected, setAutoSelected] = useState(false)
  const [formData, setFormData] = useState({
    quantity: 1,
    deliveryAddress: '',
    deliveryDate: '',
    specialInstructions: '',
    // Measurements
    chest: '',
    waist: '',
    hips: '',
    shoulder: '',
    sleeveLength: '',
    shirtLength: '',
    trouserLength: '',
    inseam: '',
    outseam: '',
    neck: '',
    notes: '',
  })
  const sampleDesigns = [
    { label: 'Select sample', value: '' },
    { label: 'Lagos Gala Dress', value: 'Lagos Gala Dress' },
    { label: 'Aso-ebi Kaftan', value: 'Aso-ebi Kaftan' },
    { label: 'Corporate Power Suit', value: 'Corporate Power Suit' },
    { label: 'Ankara Fusion', value: 'Ankara Fusion' },
    { label: 'Other (enter manually)', value: 'OTHER' },
  ]

  const [customStyle, setCustomStyle] = useState({
    sample: '',
    name: '',
    category: categories[0],
    basePrice: '',
    description: '',
  })
  const [customImagePreview, setCustomImagePreview] = useState('')
  const [showMeasurementModal, setShowMeasurementModal] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    fetchStyles()
  }, [])

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  // Auto-select design from query parameter
  useEffect(() => {
    const designId = searchParams.get('designId')
    if (designId && !autoSelected && (platformStyles.length > 0 || tailorDesigns.length > 0)) {
      // Find the design in platform styles or tailor designs
      const allStyles = [...platformStyles, ...tailorDesigns]
      const foundStyle = allStyles.find((style) => style.id === designId)
      
      if (foundStyle) {
        setSelectedStyle(foundStyle)
        setOrderMode('catalog')
        setAutoSelected(true)
        
        // Scroll to order details section after a short delay
        setTimeout(() => {
          const orderDetailsSection = document.getElementById('order-details-section')
          if (orderDetailsSection) {
            orderDetailsSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        }, 300)
        
        // Remove designId from URL without reload
        const newUrl = window.location.pathname
        window.history.replaceState({}, '', newUrl)
      }
    }
  }, [searchParams, platformStyles, tailorDesigns, autoSelected])

  const fetchStyles = async () => {
    try {
      const response = await fetch('/api/styles')
      if (response.ok) {
        const data = await response.json()
        setPlatformStyles(data.platformStyles || [])
        setTailorDesigns(data.tailorDesigns || [])
      }
    } catch (error) {
      toast.error('Failed to load styles')
    } finally {
      setStylesLoading(false)
    }
  }

  const startCamera = async () => {
    setCameraError(null)
    setShowMeasurementModal(true)
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera access is not supported in this browser')
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (error: any) {
      stopCamera()
      setCameraError(error.message || 'Unable to access camera. Please allow permission and try again.')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }

  const applyAutoMeasurements = () => {
    const simulated = {
      chest: '96',
      waist: '82',
      hips: '100',
      shoulder: '46',
      sleeveLength: '63',
      shirtLength: '72',
      trouserLength: '104',
      inseam: '78',
      outseam: '104',
      neck: '39',
    }
    setFormData((prev) => ({
      ...prev,
      ...simulated,
      notes: prev.notes || 'Measurements captured via camera module',
    }))
    setShowMeasurementModal(false)
    stopCamera()
    toast.success('Measurements captured automatically')
  }

  const closeMeasurementModal = () => {
    setShowMeasurementModal(false)
    stopCamera()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (orderMode === 'catalog' && !selectedStyle) {
      toast.error('Please select a style')
      return
    }

    if (orderMode === 'custom') {
      if (!customStyle.name || !customStyle.basePrice || !customStyle.category) {
        toast.error('Please fill in all required custom design fields')
        return
      }
    }

    setLoading(true)

    try {
      const measurementFields = [
        'chest',
        'waist',
        'hips',
        'shoulder',
        'sleeveLength',
        'shirtLength',
        'trouserLength',
        'inseam',
        'outseam',
        'neck',
      ] as const

      const measurements: Record<string, number | string> = {}
      measurementFields.forEach((field) => {
        const rawValue = formData[field]
        if (rawValue) {
          const numericValue = parseFloat(rawValue)
          if (!isNaN(numericValue)) {
            measurements[field] = numericValue
          }
        }
      })

      if (formData.notes) {
        measurements.notes = formData.notes
      }

      const payload: any = {
        quantity: formData.quantity,
        deliveryAddress: formData.deliveryAddress,
        deliveryDate: formData.deliveryDate || null,
        specialInstructions: formData.specialInstructions,
        measurements,
      }

      if (orderMode === 'catalog' && selectedStyle) {
        payload.styleId = selectedStyle.id
      } else if (orderMode === 'custom') {
        payload.customStyle = {
          name: customStyle.name,
          category: customStyle.category,
          basePrice: parseFloat(customStyle.basePrice),
          description: customStyle.description,
          imageData: customImagePreview || undefined,
        }
      }

      const response = await fetch('/api/customer/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create order')
      }

      toast.success('Order created successfully!')
      router.push(`/customer/orders/${data.order.id}`)
    } catch (error: any) {
      toast.error(error.message || 'Failed to create order')
    } finally {
      setLoading(false)
    }
  }

  const totalAmount =
    orderMode === 'catalog'
      ? selectedStyle
        ? selectedStyle.basePrice * formData.quantity
        : 0
      : customStyle.basePrice
      ? parseFloat(customStyle.basePrice || '0') * formData.quantity
      : 0

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">Place New Order</h1>
            <p className="text-gray-600">Choose an existing design or create a custom look</p>
          </div>
          <div className="inline-flex rounded-lg border border-gray-200 bg-white shadow-sm">
            <button
              type="button"
              onClick={() => {
                setOrderMode('catalog')
                setSelectedStyle(null)
              }}
              className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
                orderMode === 'catalog'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:text-primary-600'
              }`}
            >
              Browse Catalog
            </button>
            <button
              type="button"
              onClick={() => {
                setOrderMode('custom')
                setSelectedStyle(null)
              }}
              className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
                orderMode === 'custom'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:text-primary-600'
              }`}
            >
              Create Custom Order
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Style Selection */}
          {orderMode === 'catalog' ? (
            <Card>
              <CardHeader>
                <CardTitle>Select Style</CardTitle>
                <CardDescription>Choose the clothing style you want</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {stylesLoading ? (
                  <div className="text-center py-8 text-gray-500">Loading styles...</div>
                ) : (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold">Platform Styles</h3>
                        <p className="text-sm text-gray-500">Curated looks from the marketplace</p>
                      </div>
                      {platformStyles.length === 0 ? (
                        <div className="text-sm text-gray-500">No platform styles available.</div>
                      ) : (
                        <div className="grid md:grid-cols-3 gap-4">
                          {platformStyles.map((style) => (
                            <button
                              key={style.id}
                              type="button"
                              onClick={() => setSelectedStyle(style)}
                              className={`p-4 border-2 rounded-lg text-left transition-all ${
                                selectedStyle?.id === style.id
                                  ? 'border-primary-600 bg-primary-50'
                                  : 'border-gray-200 hover:border-primary-300'
                              }`}
                            >
                              <h3 className="font-semibold mb-1">{style.name}</h3>
                              <p className="text-sm text-gray-600 mb-2">{style.category}</p>
                              <p className="text-lg font-bold text-primary-600">
                                {formatCurrency(style.basePrice)}
                              </p>
                              {style.description && (
                                <p className="text-sm text-gray-500 mt-2">{style.description}</p>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold">Tailor Designs</h3>
                        <p className="text-sm text-gray-500">Exclusive looks from verified tailors</p>
                      </div>
                      {tailorDesigns.length === 0 ? (
                        <div className="text-sm text-gray-500">No tailor designs yet. Check back soon!</div>
                      ) : (
                        <div className="grid md:grid-cols-3 gap-4">
                          {tailorDesigns.map((style) => (
                            <button
                              key={style.id}
                              type="button"
                              onClick={() => setSelectedStyle(style)}
                              className={`p-4 border-2 rounded-lg text-left transition-all ${
                                selectedStyle?.id === style.id
                                  ? 'border-primary-600 bg-primary-50'
                                  : 'border-gray-200 hover:border-primary-300'
                              }`}
                            >
                              <div className="flex justify-between items-center mb-2">
                                <h3 className="font-semibold">{style.name}</h3>
                                {style.tailor && (
                                  <span className="text-xs text-primary-600 font-medium">
                                    {style.tailor.firstName}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{style.category}</p>
                              <p className="text-lg font-bold text-primary-600">
                                {formatCurrency(style.basePrice)}
                              </p>
                              {style.description && (
                                <p className="text-sm text-gray-500 mt-2">{style.description}</p>
                              )}
                              {style.tailor && (
                                <p className="text-xs text-gray-500 mt-2">
                                  Designed by {style.tailor.firstName} {style.tailor.lastName}
                                </p>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Create Custom Design</CardTitle>
                <CardDescription>Share your vision and we'll match you with the best tailor</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Sample Design</label>
                    <select
                      className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                      value={customStyle.sample}
                      onChange={(e) => {
                        const value = e.target.value
                        if (value && value !== 'OTHER') {
                          setCustomStyle({
                            ...customStyle,
                            sample: value,
                            name: value,
                          })
                        } else {
                          setCustomStyle({
                            ...customStyle,
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
                      {customStyle.sample && customStyle.sample !== 'OTHER' ? 'Custom Design Name (optional)' : 'Design Name *'}
                    </label>
                    <Input
                      value={customStyle.name}
                      onChange={(e) => setCustomStyle({ ...customStyle, name: e.target.value })}
                      required={orderMode === 'custom' && (!customStyle.sample || customStyle.sample === 'OTHER')}
                      placeholder="Describe your design"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Category *</label>
                    <select
                      className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                      value={customStyle.category}
                      onChange={(e) => setCustomStyle({ ...customStyle, category: e.target.value })}
                    >
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Budget (NGN) *</label>
                    <Input
                      type="number"
                      min="1000"
                      step="500"
                      value={customStyle.basePrice}
                      onChange={(e) => setCustomStyle({ ...customStyle, basePrice: e.target.value })}
                      required={orderMode === 'custom'}
                      placeholder="e.g. 55000"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Upload Inspiration Image</label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (!file) {
                          setCustomImagePreview('')
                          return
                        }
                        const reader = new FileReader()
                        reader.onloadend = () => setCustomImagePreview(reader.result as string)
                        reader.readAsDataURL(file)
                      }}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Upload PNG/JPG under 5MB to help tailors understand your idea.
                    </p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Design Notes</label>
                  <Textarea
                    value={customStyle.description}
                    onChange={(e) => setCustomStyle({ ...customStyle, description: e.target.value })}
                    placeholder="Describe fabrics, colors, fit, or special details you want"
                    rows={4}
                  />
                </div>
                {customImagePreview && (
                  <div className="border rounded-lg overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={customImagePreview} alt="Custom design preview" className="w-full h-48 object-cover" />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {(orderMode === 'custom' || selectedStyle) && (
            <>
              {/* Order Details */}
              <Card id="order-details-section">
                <CardHeader>
                  <CardTitle>Order Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Quantity
                    </label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Delivery Address *
                    </label>
                    <Input
                      value={formData.deliveryAddress}
                      onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                      placeholder="Enter your delivery address"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Preferred Delivery Date
                    </label>
                    <Input
                      type="date"
                      value={formData.deliveryDate}
                      onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Special Instructions
                    </label>
                    <Textarea
                      value={formData.specialInstructions}
                      onChange={(e) => setFormData({ ...formData, specialInstructions: e.target.value })}
                      placeholder="Any special requirements or notes..."
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Measurements */}
              <Card>
                <CardHeader>
                  <CardTitle>Measurements (in cm)</CardTitle>
                  <CardDescription>
                    Enter your measurements. All fields are optional but recommended for better fit.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
                    <p className="text-sm text-gray-600">
                      Don’t know your measurements? Let us capture them automatically using your camera.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={startCamera}
                    >
                      Take Measurement
                    </Button>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Chest</label>
                      <Input
                        type="number"
                        step="0.1"
                        value={formData.chest}
                        onChange={(e) => setFormData({ ...formData, chest: e.target.value })}
                        placeholder="cm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Waist</label>
                      <Input
                        type="number"
                        step="0.1"
                        value={formData.waist}
                        onChange={(e) => setFormData({ ...formData, waist: e.target.value })}
                        placeholder="cm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Hips</label>
                      <Input
                        type="number"
                        step="0.1"
                        value={formData.hips}
                        onChange={(e) => setFormData({ ...formData, hips: e.target.value })}
                        placeholder="cm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Shoulder</label>
                      <Input
                        type="number"
                        step="0.1"
                        value={formData.shoulder}
                        onChange={(e) => setFormData({ ...formData, shoulder: e.target.value })}
                        placeholder="cm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Sleeve Length</label>
                      <Input
                        type="number"
                        step="0.1"
                        value={formData.sleeveLength}
                        onChange={(e) => setFormData({ ...formData, sleeveLength: e.target.value })}
                        placeholder="cm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Shirt Length</label>
                      <Input
                        type="number"
                        step="0.1"
                        value={formData.shirtLength}
                        onChange={(e) => setFormData({ ...formData, shirtLength: e.target.value })}
                        placeholder="cm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Trouser Length</label>
                      <Input
                        type="number"
                        step="0.1"
                        value={formData.trouserLength}
                        onChange={(e) => setFormData({ ...formData, trouserLength: e.target.value })}
                        placeholder="cm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Inseam</label>
                      <Input
                        type="number"
                        step="0.1"
                        value={formData.inseam}
                        onChange={(e) => setFormData({ ...formData, inseam: e.target.value })}
                        placeholder="cm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Outseam</label>
                      <Input
                        type="number"
                        step="0.1"
                        value={formData.outseam}
                        onChange={(e) => setFormData({ ...formData, outseam: e.target.value })}
                        placeholder="cm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Neck</label>
                      <Input
                        type="number"
                        step="0.1"
                        value={formData.neck}
                        onChange={(e) => setFormData({ ...formData, neck: e.target.value })}
                        placeholder="cm"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium mb-1">Additional Notes</label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Any additional measurement notes..."
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Order Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Style:</span>
                      <span className="font-semibold">
                        {orderMode === 'catalog' && selectedStyle
                          ? selectedStyle.name
                          : customStyle.name || 'Custom Design'}
                      </span>
                    </div>
                    {orderMode === 'catalog' && selectedStyle?.tailor && (
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Designed by:</span>
                        <span>
                          {selectedStyle.tailor.firstName} {selectedStyle.tailor.lastName}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Quantity:</span>
                      <span>{formData.quantity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Unit Price:</span>
                      <span>
                        {orderMode === 'catalog' && selectedStyle
                          ? formatCurrency(selectedStyle.basePrice)
                          : customStyle.basePrice
                          ? formatCurrency(parseFloat(customStyle.basePrice))
                          : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between text-lg font-bold pt-2 border-t">
                      <span>Total:</span>
                      <span className="text-primary-600">{formatCurrency(totalAmount)}</span>
                    </div>
                  </div>
                  <Button type="submit" className="w-full mt-6" disabled={loading}>
                    {loading ? 'Creating Order...' : 'Place Order'}
                  </Button>
                </CardContent>
              </Card>
            </>
          )}
        </form>
      </div>

      {showMeasurementModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h3 className="text-xl font-semibold">Smart Measurement Scan</h3>
                <p className="text-sm text-gray-600">
                  Stand 2 meters from the camera and ensure full body is visible.
                </p>
              </div>
              <button
                onClick={closeMeasurementModal}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              {cameraError ? (
                <div className="text-red-600 text-sm">{cameraError}</div>
              ) : (
                <div className="relative w-full rounded-lg overflow-hidden bg-black h-64">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 border-4 border-white/30 rounded-xl pointer-events-none"></div>
                </div>
              )}
              <p className="text-sm text-gray-600">
                Keep your arms slightly away from your body. Our AI module will analyze your frame and fill
                in the measurement fields automatically.
              </p>
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeMeasurementModal}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={applyAutoMeasurements}
                  disabled={!!cameraError}
                >
                  Capture Measurements
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

