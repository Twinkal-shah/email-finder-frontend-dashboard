import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Auth service functions
export const authService = {
  // Get current user session
  async getCurrentUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) throw error
      return user
    } catch (error) {
      console.error('Error getting current user:', error)
      return null
    }
  },

  // Get user profile data from Supabase Auth
  async getUserProfile(userId) {
    try {
      // First try to get from auth.users via admin API
      const { data: { user }, error } = await supabase.auth.admin.getUserById(userId)
      if (error) throw error
      return user
    } catch (error) {
      console.error('Error fetching user profile from auth:', error)
      // Fallback to profiles table if admin access fails
      try {
        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .single()
        
        if (profileError) throw profileError
        return data
      } catch (profileError) {
        console.error('Error fetching user profile from profiles:', profileError)
        return null
      }
    }
  },

  // Get all users from Supabase Auth (requires service role key)
  async getAllUsers(page = 1, perPage = 1000) {
    try {
      // Note: This requires service role key, not anon key
      const { data, error } = await supabase.auth.admin.listUsers({
        page,
        perPage
      })
      
      if (error) {
        console.warn('Admin API access denied. This requires service role key:', error.message)
        // Fallback to profiles table if available
        return await this.getAllUsersFromProfiles(page, perPage)
      }
      return data
    } catch (error) {
      console.error('Error fetching all users from auth:', error)
      // Fallback to profiles table
      return await this.getAllUsersFromProfiles(page, perPage)
    }
  },

  // Fallback: Get users from profiles table
  async getAllUsersFromProfiles(page = 1, perPage = 1000) {
    try {
      const offset = (page - 1) * perPage
      
      // Get total count
      const { count, error: countError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
      
      if (countError) throw countError
      
      // Get paginated data
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .range(offset, offset + perPage - 1)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      return {
        users: data || [],
        total: count || 0
      }
    } catch (error) {
      console.error('Error fetching users from profiles:', error)
      return { users: [], total: 0 }
    }
  },

  // Sign in with email and password
  async signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      if (error) throw error
      return data
    } catch (error) {
      console.error('Error signing in:', error)
      throw error
    }
  },

  // Sign out
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
    } catch (error) {
      console.error('Error signing out:', error)
      throw error
    }
  },

  // Listen to auth state changes
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback)
  },

  // Get session from URL (for redirects)
  async getSessionFromUrl() {
    try {
      const { data, error } = await supabase.auth.getSessionFromUrl()
      if (error) throw error
      return data
    } catch (error) {
      console.error('Error getting session from URL:', error)
      return null
    }
  }
}

// Database service functions
export const dbService = {
  // Get user by email from Supabase Auth
  async getUserByEmail(email) {
    try {
      const { data, error } = await supabase.auth.admin.getUserByEmail(email)
      
      if (error) throw error
      return data.user
    } catch (error) {
      console.error('Error fetching user by email from auth:', error)
      // Fallback to profiles table
      try {
        const { data, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', email)
          .single()
        
        if (profileError) throw profileError
        return data
      } catch (profileError) {
        console.error('Error fetching user by email from profiles:', profileError)
        return null
      }
    }
  },

  // Create or update user profile
  async upsertUserProfile(userData) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert(userData)
        .select()
        .single()
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Error upserting user profile:', error)
      throw error
    }
  },

  // Get user login events
  async getUserLoginEvents(userId, limit = 10) {
    try {
      const { data, error } = await supabase
        .from('login_events')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Error fetching login events:', error)
      return []
    }
  }
}

export default supabase