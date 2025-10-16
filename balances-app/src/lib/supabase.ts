import { createClient } from '@supabase/supabase-js'
import { createBrowserClient, createServerClient as createServerSupabaseClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
}

if (!supabaseAnonKey) {
  throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

// Legacy client for backward compatibility
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Client component client with auth support
export function createClientComponentClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

// Server component client with auth support
export async function createServerComponentClient() {
  // Dynamic import of cookies to avoid import at top level
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  
  return createServerSupabaseClient(
    supabaseUrl!,
    supabaseAnonKey!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

// Service role client for backend operations
export function createServerClient() {
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables for server client')
  }
  
  return createClient(supabaseUrl, supabaseServiceKey)
}