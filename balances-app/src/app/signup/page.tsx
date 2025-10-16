'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SignupForm } from '@/components/auth/SignupForm'
import { AuthLoadingState } from '@/components/auth/AuthLoadingState'
import { useAuth } from '@/stores/auth'
import Link from 'next/link'

export default function SignupPage() {
  const router = useRouter()
  const { isAuthenticated, isInitialized, loading, error } = useAuth()

  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, isInitialized, router])

  const handleSignupSuccess = () => {
    router.push('/dashboard')
  }

  // Show loading state while initializing
  if (!isInitialized || loading) {
    return <AuthLoadingState message="Checking authentication..." />
  }

  // Avoid flash of signup form when already authenticated
  if (isAuthenticated) {
    return <AuthLoadingState message="Redirecting to dashboard..." />
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            Create Account
          </h1>
          <p className="text-muted-foreground mt-2">
            Join Bancolombia Dashboard for transaction monitoring
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
        
        <SignupForm onSuccess={handleSignupSuccess} />
        
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>
            Already have an account?{' '}
            <Link 
              href="/login" 
              className="text-primary hover:underline font-medium"
            >
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}