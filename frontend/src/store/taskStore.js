import { create } from 'zustand'
import api from '../lib/axios'

export const useTaskStore = create((set, get) => ({
  tasks: [],
  currentTask: null,
  isLoading: false,
  error: null,

  fetchTasks: async (projectId) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.get('/tasks', { params: { project: projectId } })
      set({ tasks: response.data.tasks, isLoading: false })
    } catch (error) {
      set({ error: error.response?.data?.message, isLoading: false })
    }
  },

  fetchTask: async (id) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.get(`/tasks/${id}`)
      set({ currentTask: response.data.task, isLoading: false })
      return { success: true, task: response.data.task }
    } catch (error) {
      set({ error: error.response?.data?.message, isLoading: false })
      return { success: false, error: error.response?.data?.message || 'Failed to load task' }
    }
  },

  createTask: async (taskData) => {
    try {
      const response = await api.post('/tasks', taskData)
      set({ tasks: [...get().tasks, response.data.task] })
      return { success: true, task: response.data.task }
    } catch (error) {
      return { success: false, error: error.response?.data?.message }
    }
  },

  updateTask: async (id, taskData) => {
    try {
      const response = await api.put(`/tasks/${id}`, taskData)
      set({
        currentTask: response.data.task,
        tasks: get().tasks.map(t => t.id === Number(id) ? response.data.task : t)
      })
      return { success: true }
    } catch (error) {
      return { success: false, error: error.response?.data?.message }
    }
  },

  deleteTask: async (id) => {
    try {
      await api.delete(`/tasks/${id}`)
      set({ tasks: get().tasks.filter(t => t.id !== Number(id)) })
      return { success: true }
    } catch (error) {
      return { success: false, error: error.response?.data?.message }
    }
  },

  moveTask: async (id, board, order) => {
    try {
      const response = await api.patch(`/tasks/${id}/move`, { board, order })
      set({
        tasks: get().tasks.map(t => t.id === Number(id) ? response.data.task : t)
      })
      return { success: true }
    } catch (error) {
      return { success: false, error: error.response?.data?.message }
    }
  },

  assignTask: async (id, userIds) => {
    try {
      const response = await api.post(`/tasks/${id}/assign`, { userIds })
      set({
        tasks: get().tasks.map(t => t.id === Number(id) ? response.data.task : t)
      })
      return { success: true }
    } catch (error) {
      return { success: false, error: error.response?.data?.message }
    }
  },

  updateTaskStatus: async (id, status) => {
    try {
      const response = await api.patch(`/tasks/${id}/status`, { status })
      set({
        tasks: get().tasks.map(t => t.id === Number(id) ? response.data.task : t)
      })
      return { success: true }
    } catch (error) {
      return { success: false, error: error.response?.data?.message }
    }
  },

  fetchTaskComments: async (taskId) => {
    try {
      const response = await api.get(`/comments/task/${taskId}`)
      return { success: true, comments: response.data.comments }
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to load comments' }
    }
  },

  createTaskComment: async ({ taskId, content, parentCommentId = null }) => {
    try {
      const payload = {
        task: Number(taskId),
        content,
        parentCommentId
      }
      const response = await api.post('/comments', payload)
      return { success: true, comment: response.data.comment }
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to post comment' }
    }
  },

  uploadTaskAttachment: async (taskId, file) => {
    try {
      console.log('📦 Store: Creating FormData for file:', file.name);
      const formData = new FormData()
      formData.append('file', file)
      
      console.log('📡 Store: Sending POST request to /tasks/' + taskId + '/attachments');
      const response = await api.post(`/tasks/${taskId}/attachments`, formData)
      
      console.log('✅ Store: Response received:', response.data);
      set({
        currentTask: response.data.task,
        tasks: get().tasks.map(t => t.id === Number(taskId) ? response.data.task : t)
      })
      return { success: true, task: response.data.task, attachment: response.data.attachment }
    } catch (error) {
      console.error('❌ Store: Upload failed:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.message || 'Failed to upload file' }
    }
  },
}))
