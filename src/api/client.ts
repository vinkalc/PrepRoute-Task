import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request Interceptor: Injects the authorization token
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response Interceptor: Handles authorization expirations and error toasts
apiClient.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    const status = error.response?.status
    console.error('API Response Error Details:', error.response?.data);
    let message = error.response?.data?.message || error.message || 'An unexpected error occurred'

    // Extract detail from validation errors array or object structure
    const backendErrors = error.response?.data?.errors
    if (backendErrors && Array.isArray(backendErrors)) {
      const details = backendErrors.map((err: any) => err.msg || err.message).filter(Boolean).join(', ')
      if (details) {
        message = `${message}: ${details}`
      }
    } else if (backendErrors && typeof backendErrors === 'object') {
      const details = Object.values(backendErrors).map((val: any) => typeof val === 'string' ? val : (val?.message || val?.msg)).filter(Boolean).join(', ')
      if (details) {
        message = `${message}: ${details}`
      }
    }

    if (status === 401) {
      // Automatic logout on token expiration
      toast.error('Session expired. Please log in again.')
      useAuthStore.getState().logout()
      // Redirect to login if not already there
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    } else if (status === 403) {
      toast.error('Forbidden: You do not have permissions to perform this action.')
    } else if (status === 404) {
      // Don't toast 404s globally always, but useful as general fallback
      console.warn('API Resource not found:', error.config?.url)
    } else if (status >= 500) {
      toast.error(`Server Error (${status}): Please try again later.`)
    } else {
      // Connection errors, network issues
      toast.error(message)
    }

    return Promise.reject(error)
  }
)
