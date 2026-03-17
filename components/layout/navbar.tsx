'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { UserCircle } from 'lucide-react'
import { NotificationBell } from '@/components/notifications/notification-bell'
import toast from 'react-hot-toast'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
}

export function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user)
        }
      })
      .catch(() => {
        // Not logged in
      })
  }, [])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      toast.success('Logged out successfully')
      router.push('/')
      setUser(null)
    } catch (error) {
      toast.error('Logout failed')
    }
  }

  const tailorLinks = [
    { href: '/tailor/dashboard', label: 'Dashboard' },
    { href: '/tailor/designs', label: 'Manage Designs' },
    { href: '/tailor/orders/claim', label: 'Claim Orders' },
    { href: '/tailor/orders', label: 'View All Orders' },
  ]

  const customerLinks = [
    { href: '/customer/dashboard', label: 'Dashboard' },
    { href: '/customer/orders', label: 'My Orders' },
    { href: '/customer/designs', label: 'Designs' },
  ]

  const getLinkClasses = (href: string) => {
    const isActive = pathname.startsWith(href)
    return [
      'px-3 py-1 rounded-full text-sm font-semibold transition-all duration-200',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
      isActive
        ? 'bg-gradient-to-r from-primary-500 to-indigo-500 text-white shadow-md shadow-primary-200'
        : 'text-gray-600 hover:text-primary-600 hover:bg-primary-50',
    ].join(' ')
  }

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 gap-6">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center">
              <h1 className="text-2xl font-bold text-primary-600">E-Tailoring</h1>
            </Link>
            {user?.role === 'TAILOR' && (
              <div className="hidden md:flex items-center gap-3">
                {tailorLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={getLinkClasses(link.href)}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
            {user?.role === 'CUSTOMER' && (
              <div className="hidden md:flex items-center gap-3">
                {customerLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={getLinkClasses(link.href)}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <NotificationBell />
                <Link href="/profile">
                  <Button variant="ghost" className="flex items-center gap-2">
                    <UserCircle className="h-4 w-4" />
                    <span>{user.firstName} {user.lastName}</span>
                  </Button>
                </Link>
                <Button variant="destructive" onClick={handleLogout}>
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link href="/auth/login">
                  <Button variant="ghost">Login</Button>
                </Link>
                <Link href="/auth/register">
                  <Button>Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

