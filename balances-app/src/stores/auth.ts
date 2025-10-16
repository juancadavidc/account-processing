import { create } from 'zustand'
import { AuthUser, AuthError, LoginCredentials, SignUpCredentials, authService } from '@/lib/auth'
import { SessionManager } from '@/lib/session'

interface AuthState {
  // State
  user: AuthUser | null
  loading: boolean
  error: AuthError | null
  isInitialized: boolean

  // Actions
  signIn: (credentials: LoginCredentials) => Promise<boolean>
  signUp: (credentials: SignUpCredentials) => Promise<boolean>
  signOut: () => Promise<void>
  clearError: () => void
  initializeAuth: () => Promise<void>
  setUser: (user: AuthUser | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: AuthError | null) => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  user: null,
  loading: false,
  error: null,
  isInitialized: false,

  // Sign in action
  signIn: async (credentials: LoginCredentials): Promise<boolean> => {
    set({ loading: true, error: null })

    try {
      const { user, error } = await authService.signIn(credentials)

      if (error) {
        set({ error, loading: false })
        return false
      }

      if (user) {
        // Store session data
        SessionManager.storeSession(user)
        set({ user, loading: false, error: null })
        return true
      }

      set({ loading: false })
      return false
    } catch {
      set({ 
        error: { message: 'An unexpected error occurred during sign in' }, 
        loading: false 
      })
      return false
    }
  },

  // Sign up action
  signUp: async (credentials: SignUpCredentials): Promise<boolean> => {
    set({ loading: true, error: null })

    try {
      const { user, error } = await authService.signUp(credentials)

      if (error) {
        set({ error, loading: false })
        return false
      }

      if (user) {
        // Store session data
        SessionManager.storeSession(user)
        set({ user, loading: false, error: null })
        return true
      }

      set({ loading: false })
      return false
    } catch {
      set({ 
        error: { message: 'An unexpected error occurred during sign up' }, 
        loading: false 
      })
      return false
    }
  },

  // Sign out action
  signOut: async (): Promise<void> => {
    set({ loading: true, error: null })

    try {
      const { error } = await authService.signOut()

      // Always clear session data, even if Supabase signOut fails
      SessionManager.forceLogout()

      if (error) {
        set({ error, loading: false, user: null })
        return
      }

      set({ user: null, loading: false, error: null })
    } catch {
      SessionManager.forceLogout()
      set({ 
        error: { message: 'An unexpected error occurred during sign out' }, 
        loading: false,
        user: null
      })
    }
  },

  // Clear error
  clearError: () => {
    set({ error: null })
  },

  // Initialize authentication state
  initializeAuth: async (): Promise<void> => {
    if (get().isInitialized) return

    set({ loading: true })

    try {
      // Check for stored session first
      const storedSession = SessionManager.getSession()
      if (storedSession && SessionManager.isSessionValid()) {
        set({ 
          user: storedSession.user, 
          loading: false, 
          isInitialized: true,
          error: null
        })
        
        // Initialize session cleanup
        SessionManager.initSessionCleanup()
        
        // Set up auth state change listener
        authService.onAuthStateChange((user, error) => {
          if (user) {
            SessionManager.storeSession(user)
            set({ user, error })
          } else {
            SessionManager.clearSession()
            set({ user: null, error })
          }
        })
        
        return
      }

      // No valid session, check with Supabase
      const { user, error } = await authService.getCurrentUser()

      if (user) {
        SessionManager.storeSession(user)
        SessionManager.initSessionCleanup()
      }

      set({ 
        user, 
        error, 
        loading: false, 
        isInitialized: true 
      })

      // Set up auth state change listener
      authService.onAuthStateChange((user, error) => {
        if (user) {
          SessionManager.storeSession(user)
          set({ user, error })
        } else {
          SessionManager.clearSession()
          set({ user: null, error })
        }
      })
    } catch {
      set({ 
        error: { message: 'Failed to initialize authentication' }, 
        loading: false, 
        isInitialized: true 
      })
    }
  },

  // Set user (for manual updates)
  setUser: (user: AuthUser | null) => {
    set({ user })
  },

  // Set loading state
  setLoading: (loading: boolean) => {
    set({ loading })
  },

  // Set error state
  setError: (error: AuthError | null) => {
    set({ error })
  },
}))

// Utility selectors
export const useAuth = () => {
  const { user, loading, error, isInitialized } = useAuthStore()
  
  return {
    user,
    loading,
    error,
    isInitialized,
    isAuthenticated: !!user,
  }
}

export const useAuthActions = () => {
  const { signIn, signUp, signOut, clearError, initializeAuth } = useAuthStore()
  
  return {
    signIn,
    signUp,
    signOut,
    clearError,
    initializeAuth,
  }
}