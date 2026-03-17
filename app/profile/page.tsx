'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/layout/navbar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { UserCircle } from 'lucide-react'
import toast from 'react-hot-toast'

interface ProfileResponse {
  profile: {
    id: string
    email: string
    firstName: string
    lastName: string
    phone: string | null
    address: string | null
    role: 'CUSTOMER' | 'TAILOR' | 'ADMIN'
    tailor?: {
      bio: string | null
      experience: number | null
      rating: number | null
      totalOrders: number | null
      completedOrders: number | null
      bankName: string | null
      accountName: string | null
      accountNumber: string | null
    } | null
  }
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<ProfileResponse['profile'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
  })
  const [tailorForm, setTailorForm] = useState({
    bio: '',
    experience: '',
  })
  const [bankForm, setBankForm] = useState({
    bankName: '',
    accountName: '',
    accountNumber: '',
  })

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/profile', { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to load profile')
      const data = (await res.json()) as ProfileResponse
      setProfile(data.profile)
      setForm({
        firstName: data.profile.firstName,
        lastName: data.profile.lastName,
        phone: data.profile.phone || '',
        address: data.profile.address || '',
      })
      if (data.profile.tailor) {
        setTailorForm({
          bio: data.profile.tailor.bio || '',
          experience: data.profile.tailor.experience?.toString() || '',
        })
        setBankForm({
          bankName: data.profile.tailor.bankName || '',
          accountName: data.profile.tailor.accountName || '',
          accountNumber: data.profile.tailor.accountNumber || '',
        })
      }
    } catch (error) {
      toast.error((error as Error).message || 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
    setSaving(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...form,
          tailor:
            profile.role === 'TAILOR'
              ? {
                  bio: tailorForm.bio || null,
                  experience: tailorForm.experience ? parseInt(tailorForm.experience) : null,
                  bankName: bankForm.bankName || null,
                  accountName: bankForm.accountName || null,
                  accountNumber: bankForm.accountNumber || null,
                }
              : undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update profile')
      }

      toast.success('Profile updated successfully')
      // Navigate back to dashboard
      router.push(profile.role === 'TAILOR' ? '/tailor/dashboard' : '/customer/dashboard')
    } catch (error) {
      toast.error((error as Error).message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          Loading profile...
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          Unable to load profile
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-primary-100 flex items-center justify-center">
            <UserCircle className="h-10 w-10 text-primary-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">
              {profile.firstName} {profile.lastName}
            </h1>
            <p className="text-gray-600">{profile.email}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Update how we can reach you</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">First Name</label>
                  <Input
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Last Name</label>
                  <Input
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <Input value={profile.email} disabled />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+234 800 000 0000"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Address</label>
                <Textarea
                  rows={3}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Street, City, State"
                />
              </div>
            </CardContent>
          </Card>

          {profile.role === 'TAILOR' && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Tailor Information</CardTitle>
                  <CardDescription>Tell customers about your experience and expertise</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Bio</label>
                    <Textarea
                      rows={4}
                      value={tailorForm.bio}
                      onChange={(e) => setTailorForm({ ...tailorForm, bio: e.target.value })}
                      placeholder="Tell customers about your skills, specialties, and what makes you unique..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Years of Experience</label>
                    <Input
                      type="number"
                      min="0"
                      value={tailorForm.experience}
                      onChange={(e) => setTailorForm({ ...tailorForm, experience: e.target.value })}
                      placeholder="e.g. 5"
                    />
                  </div>
                  {profile.tailor && (
                    <div className="grid md:grid-cols-3 gap-4 pt-4 border-t">
                      <div>
                        <p className="text-sm text-gray-600">Rating</p>
                        <p className="text-lg font-semibold">
                          {profile.tailor.rating?.toFixed(1) || '0.0'} ⭐
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total Orders</p>
                        <p className="text-lg font-semibold">{profile.tailor.totalOrders || 0}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Completed</p>
                        <p className="text-lg font-semibold">{profile.tailor.completedOrders || 0}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Bank Details</CardTitle>
                  <CardDescription>Customers will transfer funds directly to this account</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Bank Name</label>
                      <Input
                        value={bankForm.bankName}
                        onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                        placeholder="e.g. GTBank, Access"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Account Name</label>
                      <Input
                        value={bankForm.accountName}
                        onChange={(e) => setBankForm({ ...bankForm, accountName: e.target.value })}
                        placeholder="Account name as registered"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Account Number</label>
                    <Input
                      value={bankForm.accountNumber}
                      onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                      placeholder="10-digit NUBAN"
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

