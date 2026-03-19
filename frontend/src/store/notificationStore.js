import { create } from 'zustand'
import api from '../lib/axios'

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async () => {
    set({ isLoading: true })
    try {
      const response = await api.get('/notifications')
      set({
        notifications: response.data.notifications,
        unreadCount: response.data.unreadCount,
        isLoading: false
      })
    } catch (error) {
      set({ isLoading: false })
    }
  },

  markAsRead: async (id) => {
    try {
      await api.put(`/notifications/${id}/read`)
      set({
        notifications: get().notifications.map(n =>
          n.id === Number(id) ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, get().unreadCount - 1)
      })
    } catch (error) {
      console.error('Failed to mark notification as read', error)
    }
  },

  markAllAsRead: async () => {
    try {
      await api.put('/notifications/read-all')
      set({
        notifications: get().notifications.map(n => ({ ...n, read: true })),
        unreadCount: 0
      })
    } catch (error) {
      console.error('Failed to mark all notifications as read', error)
    }
  },

  deleteNotification: async (id) => {
    try {
      const current = get().notifications.find((n) => n.id === Number(id))
      await api.delete(`/notifications/${id}`)
      set({
        notifications: get().notifications.filter(n => n.id !== Number(id)),
        unreadCount: current && !current.read ? Math.max(0, get().unreadCount - 1) : get().unreadCount
      })
    } catch (error) {
      console.error('Failed to delete notification', error)
    }
  },

  addNotification: (notification) => {
    const exists = get().notifications.some((item) => item.id === notification.id)
    if (exists) return

    set({
      notifications: [notification, ...get().notifications],
      unreadCount: get().unreadCount + 1
    })
  },
}))
