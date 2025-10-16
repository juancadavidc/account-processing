import { User } from '@supabase/supabase-js'
import { createClientComponentClient } from './supabase'

export interface AuthUser {
  id: string
  email: string
  role?: string
  metadata?: Record<string, unknown>
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface SignUpCredentials {
  email: string
  password: string
  fullName?: string
  role?: string
}

export interface AuthError {
  message: string
  code?: string
}

/**
 * Authentication utilities for Supabase Auth integration
 */
export class AuthService {
  private supabase = createClientComponentClient()

  /**
   * Sign up new user with email and password
   */
  async signUp(credentials: SignUpCredentials): Promise<{ user: AuthUser | null; error: AuthError | null }> {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          data: {
            full_name: credentials.fullName,
            role: credentials.role || 'user'
          }
        }
      })

      if (error) {
        return { user: null, error: { message: error.message, code: error.status?.toString() } }
      }

      const user = data.user ? this.transformUser(data.user) : null
      return { user, error: null }
    } catch {
      return { 
        user: null, 
        error: { message: 'An unexpected error occurred during sign up' } 
      }
    }
  }

  /**
   * Sign in with email and password
   */
  async signIn(credentials: LoginCredentials): Promise<{ user: AuthUser | null; error: AuthError | null }> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      })

      if (error) {
        return { user: null, error: { message: error.message, code: error.status?.toString() } }
      }

      const user = data.user ? this.transformUser(data.user) : null
      return { user, error: null }
    } catch {
      return { 
        user: null, 
        error: { message: 'An unexpected error occurred during sign in' } 
      }
    }
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await this.supabase.auth.signOut()
      
      if (error) {
        return { error: { message: error.message, code: error.status?.toString() } }
      }

      return { error: null }
    } catch {
      return { error: { message: 'An unexpected error occurred during sign out' } }
    }
  }

  /**
   * Get current user session
   */
  async getCurrentUser(): Promise<{ user: AuthUser | null; error: AuthError | null }> {
    try {
      const { data, error } = await this.supabase.auth.getUser()

      if (error) {
        return { user: null, error: { message: error.message, code: error.status?.toString() } }
      }

      const user = data.user ? this.transformUser(data.user) : null
      return { user, error: null }
    } catch {
      return { 
        user: null, 
        error: { message: 'An unexpected error occurred while getting user' } 
      }
    }
  }

  /**
   * Listen for authentication state changes
   */
  onAuthStateChange(callback: (user: AuthUser | null, error: AuthError | null) => void) {
    return this.supabase.auth.onAuthStateChange((event, session) => {
      const user = session?.user ? this.transformUser(session.user) : null
      callback(user, null)
    })
  }

  /**
   * Get current session
   */
  async getSession() {
    return await this.supabase.auth.getSession()
  }

  /**
   * Transform Supabase User to AuthUser
   */
  private transformUser(user: User): AuthUser {
    return {
      id: user.id,
      email: user.email || '',
      role: user.user_metadata?.role || 'user',
      metadata: user.user_metadata || {},
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const { user } = await this.getCurrentUser()
    return user !== null
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
    return emailRegex.test(email)
  }

  /**
   * Validate password strength
   */
  static validatePassword(password: string): { isValid: boolean; message?: string } {
    if (password.length < 6) {
      return { isValid: false, message: 'Password must be at least 6 characters long' }
    }
    return { isValid: true }
  }
}

// Export singleton instance
export const authService = new AuthService()

// Auth utility functions
export const validateLoginForm = (email: string, password: string): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {}

  if (!email) {
    errors.email = 'Email is required'
  } else if (!AuthService.validateEmail(email)) {
    errors.email = 'Please enter a valid email address'
  }

  if (!password) {
    errors.password = 'Password is required'
  } else {
    const passwordValidation = AuthService.validatePassword(password)
    if (!passwordValidation.isValid) {
      errors.password = passwordValidation.message || 'Invalid password'
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}

export const validateSignUpForm = (email: string, password: string, confirmPassword: string, fullName?: string): { isValid: boolean; errors: Record<string, string> } => {
  const errors: Record<string, string> = {}

  if (!email) {
    errors.email = 'Email is required'
  } else if (!AuthService.validateEmail(email)) {
    errors.email = 'Please enter a valid email address'
  }

  if (!password) {
    errors.password = 'Password is required'
  } else {
    const passwordValidation = AuthService.validatePassword(password)
    if (!passwordValidation.isValid) {
      errors.password = passwordValidation.message || 'Invalid password'
    }
  }

  if (!confirmPassword) {
    errors.confirmPassword = 'Please confirm your password'
  } else if (password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match'
  }

  if (fullName && fullName.trim().length < 2) {
    errors.fullName = 'Full name must be at least 2 characters long'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}