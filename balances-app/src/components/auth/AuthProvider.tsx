'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/stores/auth'
import { AuthErrorBoundary } from './AuthErrorBoundary'

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { initializeAuth, isInitialized, user } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isInitialized) {
      initializeAuth().catch((error) => {
        console.error('Failed to initialize authentication:', error)
      })
    }
  }, [initializeAuth, isInitialized])

  // Handle redirect to login when user logs out
  useEffect(() => {
    if (isInitialized && !user && pathname !== '/login' && pathname !== '/signup' && pathname !== '/') {
      router.push('/login')
    }
  }, [user, isInitialized, pathname, router])

  return (
    <AuthErrorBoundary>
      {children}
    </AuthErrorBoundary>
  )
}