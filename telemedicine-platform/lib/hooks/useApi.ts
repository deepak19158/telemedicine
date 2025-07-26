import { useState, useEffect, useCallback } from 'react'
import { apiClient, ApiResponse } from '../api-client'

interface UseApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  timedOut: boolean
  retryCount: number
}

interface UseApiOptions {
  immediate?: boolean
  onSuccess?: (data: any) => void
  onError?: (error: string) => void
  timeout?: number
  enabled?: boolean
  retries?: number
  retryDelay?: number
}

// Generic hook for API calls
export function useApi<T>(
  apiCall: () => Promise<ApiResponse<T>>,
  options: UseApiOptions = {}
): UseApiState<T> {
  const { 
    immediate = true, 
    onSuccess, 
    onError, 
    timeout = 30000, // 30 second timeout
    enabled = true,
    retries = 2, // Default 2 retries
    retryDelay = 1000 // 1 second delay between retries
  } = options
  
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [timedOut, setTimedOut] = useState(false)
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const [loadingStartTime, setLoadingStartTime] = useState<number | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const fetchData = useCallback(async (attemptNumber = 0) => {
    if (!enabled) return
    
    try {
      console.log(`🔄 Starting API call attempt ${attemptNumber + 1}/${retries + 1}...`) // Debug log
      
      // Cancel previous request if it exists
      if (abortController) {
        abortController.abort()
      }
      
      const newAbortController = new AbortController()
      setAbortController(newAbortController)
      
      if (attemptNumber === 0) {
        setLoading(true)
        setError(null)
        setTimedOut(false)
        setLoadingStartTime(Date.now())
        setRetryCount(0)
      }
      
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          setTimedOut(true)
          reject(new Error('Request timeout - please check your connection'))
        }, timeout)
      })
      
      // Race between API call and timeout
      const response = await Promise.race([
        apiCall(),
        timeoutPromise
      ]) as ApiResponse<T>
      
      // Check if request was aborted
      if (newAbortController.signal.aborted) {
        console.log('🚫 Request was aborted') // Debug log
        return
      }
      
      console.log('✅ API call response:', response) // Debug log
      
      if (response.success) {
        setData(response.data)
        onSuccess?.(response.data)
        setRetryCount(0) // Reset retry count on success
        console.log('✅ API call successful, data set') // Debug log
      } else {
        const errorMsg = response.error || 'Unknown error occurred'
        
        // Check if we should retry for certain errors
        const shouldRetry = attemptNumber < retries && (
          response.status >= 500 || // Server errors
          response.status === 0 ||  // Network errors
          errorMsg.includes('Network error') ||
          errorMsg.includes('timeout')
        )
        
        if (shouldRetry) {
          console.log(`🔁 Retrying after error: ${errorMsg}. Attempt ${attemptNumber + 2}/${retries + 1}`) // Debug log
          setRetryCount(attemptNumber + 1)
          setTimeout(() => {
            fetchData(attemptNumber + 1)
          }, retryDelay * (attemptNumber + 1)) // Exponential backoff
          return
        }
        
        setError(errorMsg)
        onError?.(errorMsg)
        console.log('❌ API call failed:', errorMsg) // Debug log
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('🚫 Request was aborted') // Debug log
        return
      }
      
      const errorMessage = err instanceof Error ? err.message : 'Network error'
      
      // Check if we should retry
      const shouldRetry = attemptNumber < retries && (
        errorMessage.includes('Network error') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('fetch')
      )
      
      if (shouldRetry) {
        console.log(`🔁 Retrying after error: ${errorMessage}. Attempt ${attemptNumber + 2}/${retries + 1}`) // Debug log
        setRetryCount(attemptNumber + 1)
        setTimeout(() => {
          fetchData(attemptNumber + 1)
        }, retryDelay * (attemptNumber + 1)) // Exponential backoff
        return
      }
      
      setError(errorMessage)
      onError?.(errorMessage)
      console.log('💥 API call error:', errorMessage) // Debug log
    } finally {
      if (attemptNumber === 0 || attemptNumber >= retries) {
        setLoading(false)
        setAbortController(null)
        console.log('🏁 API call finished, loading set to false') // Debug log
      }
    }
  }, [enabled, timeout, retries, retryDelay]) // Removed apiCall, onSuccess, onError from dependencies to prevent infinite loops

  useEffect(() => {
    if (immediate && enabled) {
      console.log('🚀 useEffect triggered, calling fetchData') // Debug log
      fetchData()
    }
    
    // Cleanup function to abort ongoing requests
    return () => {
      if (abortController) {
        abortController.abort()
      }
    }
  }, [immediate, enabled]) // Removed fetchData from dependencies

  return {
    data,
    loading,
    error,
    refetch: () => fetchData(0), // Always start from attempt 0 for manual refetch
    timedOut,
    retryCount
  }
}

// Hook for handling loading timeouts
export function useLoadingTimeout(isLoading: boolean, timeoutMs: number = 10000) {
  const [hasTimedOut, setHasTimedOut] = useState(false)
  
  useEffect(() => {
    if (!isLoading) {
      setHasTimedOut(false)
      return
    }
    
    const timer = setTimeout(() => {
      setHasTimedOut(true)
      console.log('⏰ Loading timeout reached after', timeoutMs, 'ms')
    }, timeoutMs)
    
    return () => clearTimeout(timer)
  }, [isLoading, timeoutMs])
  
  return hasTimedOut
}

// Hook for mutations (POST, PUT, DELETE)
export function useApiMutation<TData, TVariables = any>(
  mutationFn: (variables: TVariables) => Promise<ApiResponse<TData>>,
  options: {
    onSuccess?: (data: TData) => void
    onError?: (error: string) => void
  } = {}
) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = useCallback(async (variables: TVariables) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await mutationFn(variables)
      
      if (response.success) {
        options.onSuccess?.(response.data)
        return response.data
      } else {
        setError(response.error || 'Unknown error occurred')
        options.onError?.(response.error || 'Unknown error occurred')
        throw new Error(response.error)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error'
      setError(errorMessage)
      options.onError?.(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }, [mutationFn, options])

  return {
    mutate,
    loading,
    error,
    reset: () => setError(null)
  }
}

// Specific hooks for common API calls

// User Profile Hooks
export function useUserProfile(options: { enabled?: boolean } = {}) {
  const { enabled = true } = options
  
  return useApi(() => apiClient.user.getProfile(), {
    enabled,
    timeout: 15000, // 15 second timeout for profile
    onSuccess: (data) => {
      console.log('👤 User profile loaded successfully:', data)
    },
    onError: (error) => {
      console.log('👤 User profile failed to load:', error)
    }
  })
}

export function useUpdateUserProfile() {
  return useApiMutation((profileData: any) => 
    apiClient.user.updateProfile(profileData)
  )
}

export function useUploadAvatar() {
  return useApiMutation((file: File) => 
    apiClient.user.uploadAvatar(file)
  )
}

// Doctor Profile Hooks
export function useDoctorProfile() {
  return useApi(() => apiClient.doctor.getProfile())
}

export function useUpdateDoctorProfile() {
  return useApiMutation((profileData: any) => 
    apiClient.doctor.updateProfile(profileData)
  )
}

export function useDoctorAvailability() {
  return useApi(() => apiClient.doctor.getAvailability())
}

export function useUpdateDoctorAvailability() {
  return useApiMutation((availabilityData: any) => 
    apiClient.doctor.updateAvailability(availabilityData)
  )
}

// Doctor Search Hook
export function useDoctorSearch(params: Record<string, any> = {}) {
  return useApi(() => apiClient.doctor.search(params), {
    immediate: Object.keys(params).length > 0
  })
}

// Specializations Hook
export function useSpecializations() {
  return useApi(() => apiClient.doctor.getSpecializations())
}

// Admin Hooks
export function useAdminUsers(params: Record<string, any> = {}) {
  return useApi(() => apiClient.admin.getUsers(params))
}

export function useUpdateUserStatus() {
  return useApiMutation((data: { userId: string; isActive: boolean; reason?: string }) => 
    apiClient.admin.updateUserStatus(data.userId, data.isActive, data.reason)
  )
}

export function useUserAnalytics(period?: string) {
  return useApi(() => apiClient.admin.getUserAnalytics(period))
}

export function usePendingDoctors(params: Record<string, any> = {}) {
  return useApi(() => apiClient.admin.getPendingDoctors(params))
}

export function useApproveDoctor() {
  return useApiMutation((data: { 
    doctorId: string; 
    action: 'approve' | 'reject'; 
    reason?: string; 
    assignPatients?: boolean 
  }) => 
    apiClient.admin.approveDoctor(data.doctorId, data.action, data.reason, data.assignPatients)
  )
}

// Doctor Registration Hook
export function useRegisterDoctor() {
  return useApiMutation((doctorData: any) => 
    apiClient.doctor.register(doctorData)
  )
}

// Helper hook for pagination
export function usePagination(initialPage = 1, initialLimit = 10) {
  const [page, setPage] = useState(initialPage)
  const [limit, setLimit] = useState(initialLimit)

  const nextPage = () => setPage(prev => prev + 1)
  const prevPage = () => setPage(prev => Math.max(1, prev - 1))
  const goToPage = (newPage: number) => setPage(Math.max(1, newPage))
  const changeLimit = (newLimit: number) => {
    setLimit(newLimit)
    setPage(1) // Reset to first page when changing limit
  }

  return {
    page,
    limit,
    nextPage,
    prevPage,
    goToPage,
    changeLimit,
    params: { page: page.toString(), limit: limit.toString() }
  }
}

// Helper hook for search
export function useSearch(initialQuery = '') {
  const [query, setQuery] = useState(initialQuery)
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 300) // 300ms debounce

    return () => clearTimeout(timer)
  }, [query])

  return {
    query,
    debouncedQuery,
    setQuery,
    clearQuery: () => setQuery('')
  }
}