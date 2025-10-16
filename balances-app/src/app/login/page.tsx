'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LoginForm } from '@/components/auth/LoginForm'
import { AuthLoadingState } from '@/components/auth/AuthLoadingState'
import { useAuth } from '@/stores/auth'

export default function LoginPage() {
  const router = useRouter()
  const { isAuthenticated, isInitialized, loading, error } = useAuth()

  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, isInitialized, router])

  const handleLoginSuccess = () => {
    router.push('/dashboard')
  }

  // Show loading state while initializing
  if (!isInitialized || loading) {
    return <AuthLoadingState message="Checking authentication..." />
  }

  // Avoid flash of login form when already authenticated
  if (isAuthenticated) {
    return <AuthLoadingState message="Redirecting to dashboard..." />
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Bancolombia Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Transaction monitoring and analysis
          </p>
        </div>
        
        {/* Global authentication error */}
        {error && !loading && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive text-center">
              {error.message}
            </p>
          </div>
        )}
        
        <LoginForm onSuccess={handleLoginSuccess} />
        
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>
            Don&apos;t have an account?{' '}
            <Link 
              href="/signup" 
              className="text-primary hover:underline font-medium"
            >
              Create one here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}