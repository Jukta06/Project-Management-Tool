import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../lib/axios'
import { initializeSocket, disconnectSocket } from '../lib/socket'

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (credentials) => {
        set({ isLoading: true, error: null })
        try {
          const response = await api.post('/auth/login', credentials)
          const { token, user } = response.data

          localStorage.setItem('token', token)
          set({ user, token, isAuthenticated: true, isLoading: false })
          
          // Initialize socket connection
          initializeSocket(user.id)
          
          return { success: true }
        } catch (error) {
          const errorMessage = error.response?.data?.message || 'Login failed'
          set({ error: errorMessage, isLoading: false })
          return { success: false, error: errorMessage }
        }
      },

      register: async (userData) => {
        set({ isLoading: true, error: null })
        try {
          const response = await api.post('/auth/register', userData)
          const { token, user } = response.data

          localStorage.setItem('token', token)
          set({ user, token, isAuthenticated: true, isLoading: false })
          
          // Initialize socket connection
          initializeSocket(user.id)
          
          return { success: true }
        } catch (error) {
          const errorMessage = error.response?.data?.message || 'Registration failed'
          set({ error: errorMessage, isLoading: false })
          return { success: false, error: errorMessage }
        }
      },

      logout: () => {
        localStorage.removeItem('token')
        disconnectSocket()
        set({ user: null, token: null, isAuthenticated: false })
      },

      updateProfile: async (data) => {
        try {
          const response = await api.put('/auth/profile', data)
          set({ user: response.data.user })
          return { success: true }
        } catch (error) {
          return { success: false, error: error.response?.data?.message }
        }
      },

      uploadProfilePicture: async (file) => {
        try {
          const formData = new FormData()
          formData.append('profilePicture', file)

          const response = await api.post('/auth/profile/picture', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          })

          set({ user: response.data.user })
          return { success: true, user: response.data.user }
        } catch (error) {
          return { success: false, error: error.response?.data?.message || 'Profile picture upload failed' }
        }
      },

      checkAuth: async () => {
        const token = localStorage.getItem('token')
        if (!token) {
          set({ isAuthenticated: false })
          return
        }

        try {
          const response = await api.get('/auth/me')
          set({ user: response.data.user, isAuthenticated: true, token })
          initializeSocket(response.data.user.id)
        } catch (error) {
          localStorage.removeItem('token')
          set({ user: null, token: null, isAuthenticated: false })
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user, 
        token: state.token, 
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
)
