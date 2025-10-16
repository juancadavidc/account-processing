import { AuthUser } from './auth'

export interface SessionData {
  user: AuthUser
  expiresAt: number
  refreshToken?: string
}

export class SessionManager {
  private static readonly SESSION_KEY = 'bmad_session'
  private static readonly SESSION_DURATION = 24 * 60 * 60 * 1000 // 24 hours

  /**
   * Store session data in localStorage with expiration
   */
  static storeSession(user: AuthUser, refreshToken?: string): void {
    if (typeof window === 'undefined') return // Server-side guard

    const sessionData: SessionData = {
      user,
      expiresAt: Date.now() + this.SESSION_DURATION,
      refreshToken,
    }

    try {
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionData))
    } catch (error) {
      console.warn('Failed to store session data:', error)
    }
  }

  /**
   * Retrieve session data from localStorage
   */
  static getSession(): SessionData | null {
    if (typeof window === 'undefined') return null // Server-side guard

    try {
      const stored = localStorage.getItem(this.SESSION_KEY)
      if (!stored) return null

      const sessionData: SessionData = JSON.parse(stored)
      
      // Check if session has expired
      if (sessionData.expiresAt < Date.now()) {
        this.clearSession()
        return null
      }

      return sessionData
    } catch (error) {
      console.warn('Failed to retrieve session data:', error)
      this.clearSession()
      return null
    }
  }

  /**
   * Clear session data from localStorage
   */
  static clearSession(): void {
    if (typeof window === 'undefined') return // Server-side guard

    try {
      localStorage.removeItem(this.SESSION_KEY)
    } catch (error) {
      console.warn('Failed to clear session data:', error)
    }
  }

  /**
   * Force complete logout by clearing all session data and Supabase cookies
   */
  static forceLogout(): void {
    if (typeof window === 'undefined') return // Server-side guard

    // Clear localStorage
    this.clearSession()
    
    // Clear all Supabase-related cookies
    const cookiesToClear = [
      'sb-access-token',
      'sb-refresh-token',
      'supabase-auth-token',
      'supabase.auth.token'
    ]
    
    cookiesToClear.forEach(cookieName => {
      // Clear cookie for current domain
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
      // Clear cookie for all subdomains
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`
      // Clear cookie for parent domain (if subdomain)
      const hostParts = window.location.hostname.split('.')
      if (hostParts.length > 2) {
        const parentDomain = `.${hostParts.slice(-2).join('.')}`
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${parentDomain};`
      }
    })
  }

  /**
   * Check if current session is valid
   */
  static isSessionValid(): boolean {
    const session = this.getSession()
    return session !== null && session.expiresAt > Date.now()
  }

  /**
   * Extend session expiration
   */
  static extendSession(): void {
    const session = this.getSession()
    if (session) {
      session.expiresAt = Date.now() + this.SESSION_DURATION
      try {
        localStorage.setItem(this.SESSION_KEY, JSON.stringify(session))
      } catch (error) {
        console.warn('Failed to extend session:', error)
      }
    }
  }

  /**
   * Auto-cleanup expired sessions on page load
   */
  static initSessionCleanup(): void {
    if (typeof window === 'undefined') return

    // Check session validity on initialization
    if (!this.isSessionValid()) {
      this.clearSession()
    }

    // Set up periodic cleanup (every 5 minutes)
    setInterval(() => {
      if (!this.isSessionValid()) {
        this.clearSession()
      }
    }, 5 * 60 * 1000)

    // Extend session on user activity
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']
    
    let lastActivity = Date.now()
    const handleActivity = () => {
      const now = Date.now()
      // Only extend if more than 10 minutes since last activity
      if (now - lastActivity > 10 * 60 * 1000) {
        this.extendSession()
        lastActivity = now
      }
    }

    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true })
    })
  }

  /**
   * Clean up event listeners (for component unmounting)
   */
  static cleanup(): void {
    if (typeof window === 'undefined') return

    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']
    activityEvents.forEach(event => {
      document.removeEventListener(event, () => {})
    })
  }
}