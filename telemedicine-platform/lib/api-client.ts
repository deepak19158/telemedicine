// API Client utilities for consistent data fetching
import { getSession } from 'next-auth/react'
import { getToken } from 'next-auth/jwt'

interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: any
  headers?: Record<string, string>
  isFormData?: boolean
}

class ApiClient {
  private baseUrl: string

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || ''
  }

  private async makeRequest<T>(
    endpoint: string, 
    options: ApiRequestOptions = {}
  ): Promise<ApiResponse<T>> {
    try {
      const { method = 'GET', body, headers = {}, isFormData = false } = options

      // Get session for authentication
      const session = await getSession()
      
      // For authenticated requests, we'll rely on Next.js cookies
      // NextAuth automatically handles authentication via httpOnly cookies
      if (session?.user) {
        // Add user info to headers for backend processing
        headers['X-User-ID'] = session.user.id
        headers['X-User-Role'] = session.user.role
      }

      // Prepare request options
      const requestOptions: RequestInit = {
        method,
        headers: {
          ...(!isFormData && { 'Content-Type': 'application/json' }),
          ...headers,
        },
      }

      // Add body for non-GET requests
      if (body && method !== 'GET') {
        requestOptions.body = isFormData ? body : JSON.stringify(body)
      }

      // Make the request with credentials to include cookies
      const response = await fetch(`${this.baseUrl}/api${endpoint}`, {
        ...requestOptions,
        credentials: 'include' // Include cookies for authentication
      })
      
      // Parse response
      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}: ${response.statusText}`,
          data
        }
      }

      return {
        success: true,
        data,
        message: data.message
      }
    } catch (error) {
      console.error('API Request Error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error occurred'
      }
    }
  }

  // User Management APIs
  user = {
    getProfile: () => 
      this.makeRequest('/users/profile'),
    
    updateProfile: (profileData: any) => 
      this.makeRequest('/users/profile', {
        method: 'PUT',
        body: profileData
      }),
    
    uploadAvatar: (file: File) => {
      const formData = new FormData()
      formData.append('avatar', file)
      return this.makeRequest('/users/upload-avatar', {
        method: 'POST',
        body: formData,
        isFormData: true
      })
    },
    
    deactivateAccount: (password: string, reason?: string) => 
      this.makeRequest('/users/account', {
        method: 'DELETE',
        body: { password, reason }
      })
  }

  // Doctor Management APIs
  doctor = {
    register: (doctorData: any) => 
      this.makeRequest('/doctors/register', {
        method: 'POST',
        body: doctorData
      }),
    
    getProfile: () => 
      this.makeRequest('/doctors/profile'),
    
    updateProfile: (profileData: any) => 
      this.makeRequest('/doctors/profile', {
        method: 'PUT',
        body: profileData
      }),
    
    getAvailability: () => 
      this.makeRequest('/doctors/availability'),
    
    updateAvailability: (availabilityData: any) => 
      this.makeRequest('/doctors/availability', {
        method: 'PUT',
        body: availabilityData
      }),
    
    search: (params: Record<string, any> = {}) => {
      const queryString = new URLSearchParams(params).toString()
      return this.makeRequest(`/doctors/search?${queryString}`)
    },
    
    getSpecializations: () => 
      this.makeRequest('/doctors/specializations')
  }

  // Admin Management APIs
  admin = {
    getUsers: (params: Record<string, any> = {}) => {
      const queryString = new URLSearchParams(params).toString()
      return this.makeRequest(`/admin/users?${queryString}`)
    },
    
    updateUserStatus: (userId: string, isActive: boolean, reason?: string) => 
      this.makeRequest(`/admin/users/${userId}/status`, {
        method: 'PUT',
        body: { isActive, reason }
      }),
    
    getUserAnalytics: (period?: string) => {
      const queryString = period ? `?period=${period}` : ''
      return this.makeRequest(`/admin/users/analytics${queryString}`)
    },
    
    getPendingDoctors: (params: Record<string, any> = {}) => {
      const queryString = new URLSearchParams(params).toString()
      return this.makeRequest(`/admin/doctors/pending?${queryString}`)
    },
    
    approveDoctor: (doctorId: string, action: 'approve' | 'reject', reason?: string, assignPatients?: boolean) => 
      this.makeRequest(`/admin/doctors/${doctorId}/approve`, {
        method: 'PUT',
        body: { action, reason, assignPatients }
      })
  }

  // Generic helpers
  get = <T>(endpoint: string, params: Record<string, any> = {}) => {
    const queryString = Object.keys(params).length 
      ? `?${new URLSearchParams(params).toString()}` 
      : ''
    return this.makeRequest<T>(`${endpoint}${queryString}`)
  }

  post = <T>(endpoint: string, body: any) => 
    this.makeRequest<T>(endpoint, { method: 'POST', body })

  put = <T>(endpoint: string, body: any) => 
    this.makeRequest<T>(endpoint, { method: 'PUT', body })

  delete = <T>(endpoint: string, body?: any) => 
    this.makeRequest<T>(endpoint, { method: 'DELETE', body })
}

// Create singleton instance
export const apiClient = new ApiClient()

// Export types for use in components
export type { ApiResponse, ApiRequestOptions }

// Hook for error handling
export const useApiError = () => {
  const handleApiError = (error: string) => {
    // You can integrate with your toast notification system here
    console.error('API Error:', error)
    
    // Example: show toast notification
    // toast.error(error)
  }

  return { handleApiError }
}

// Loading state management
export const createLoadingState = () => {
  return {
    loading: false,
    error: null as string | null,
    data: null as any,
  }
}

export default apiClient