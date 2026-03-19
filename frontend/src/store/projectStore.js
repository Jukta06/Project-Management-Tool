import { create } from 'zustand'
import api from '../lib/axios'

export const useProjectStore = create((set, get) => ({
  projects: [],
  currentProject: null,
  isLoading: false,
  error: null,

  fetchProjects: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.get('/projects')
      set({ projects: response.data.projects, isLoading: false })
    } catch (error) {
      set({ error: error.response?.data?.message, isLoading: false })
    }
  },

  fetchProject: async (id) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.get(`/projects/${id}`)
      set({ currentProject: response.data.project, isLoading: false })
    } catch (error) {
      set({ error: error.response?.data?.message, isLoading: false })
    }
  },

  createProject: async (projectData) => {
    try {
      const response = await api.post('/projects', projectData)
      set({ projects: [...get().projects, response.data.project] })
      return { success: true, project: response.data.project }
    } catch (error) {
      return { success: false, error: error.response?.data?.message }
    }
  },

  updateProject: async (id, projectData) => {
    try {
      const response = await api.put(`/projects/${id}`, projectData)
      set({
        currentProject: response.data.project,
        projects: get().projects.map(p => 
          p.id === Number(id) ? response.data.project : p
        )
      })
      return { success: true }
    } catch (error) {
      return { success: false, error: error.response?.data?.message }
    }
  },

  updateProjectBoards: async (id, boards) => {
    try {
      const response = await api.put(`/projects/${id}`, { boards })
      set({
        currentProject: response.data.project,
        projects: get().projects.map((p) =>
          p.id === Number(id) ? response.data.project : p
        )
      })
      return { success: true, project: response.data.project }
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to update columns' }
    }
  },

  deleteProject: async (id) => {
    try {
      await api.delete(`/projects/${id}`)
      set({ projects: get().projects.filter(p => p.id !== Number(id)) })
      return { success: true }
    } catch (error) {
      return { success: false, error: error.response?.data?.message }
    }
  },

  markProjectCompleted: async (id) => {
    try {
      const response = await api.put(`/projects/${id}`, { status: 'completed' })
      set({
        currentProject: get().currentProject?.id === Number(id) ? response.data.project : get().currentProject,
        projects: get().projects.map((p) => (p.id === Number(id) ? response.data.project : p))
      })
      return { success: true, project: response.data.project }
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to mark project as completed' }
    }
  },

  archiveProject: async (id) => {
    try {
      const response = await api.patch(`/projects/${id}/archive`)
      set({
        currentProject: get().currentProject?.id === Number(id) ? response.data.project : get().currentProject,
        projects: get().projects.map((p) => (p.id === Number(id) ? response.data.project : p))
      })
      return { success: true, project: response.data.project }
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to archive project' }
    }
  },

  restoreProject: async (id) => {
    try {
      const response = await api.patch(`/projects/${id}/restore`)
      set({
        currentProject: get().currentProject?.id === Number(id) ? response.data.project : get().currentProject,
        projects: get().projects.map((p) => (p.id === Number(id) ? response.data.project : p))
      })
      return { success: true, project: response.data.project }
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to restore project' }
    }
  },

  addMember: async (projectId, userId, role) => {
    try {
      const response = await api.post(`/projects/${projectId}/members`, { userId, role })
      set({ currentProject: response.data.project })
      return { success: true }
    } catch (error) {
      return { success: false, error: error.response?.data?.message }
    }
  },

  removeMember: async (projectId, userId) => {
    try {
      await api.delete(`/projects/${projectId}/members/${userId}`)
      const updatedProject = { ...get().currentProject }
      updatedProject.members = updatedProject.members.filter(m => Number(m.userId) !== Number(userId))
      set({ currentProject: updatedProject })
      return { success: true }
    } catch (error) {
      return { success: false, error: error.response?.data?.message }
    }
  },

  inviteMemberByEmail: async (projectId, email, role = 'member') => {
    try {
      const response = await api.post(`/projects/${projectId}/invites`, { email, role })
      if (response.data.project) {
        set({
          currentProject: response.data.project,
          projects: get().projects.map((p) =>
            p.id === Number(projectId) ? response.data.project : p
          )
        })
      }
      return { success: true, message: response.data.message }
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to send invite' }
    }
  },

  fetchProjectInvites: async (projectId, status = '') => {
    try {
      const response = await api.get(`/projects/${projectId}/invites`, {
        params: status ? { status } : undefined
      })
      return { success: true, invites: response.data.invites }
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to fetch invites' }
    }
  },

  approveProjectInvite: async (projectId, inviteId) => {
    try {
      const response = await api.patch(`/projects/${projectId}/invites/${inviteId}/approve`)
      if (response.data.project) {
        set({
          currentProject: response.data.project,
          projects: get().projects.map((p) =>
            p.id === Number(projectId) ? response.data.project : p
          )
        })
      }
      return { success: true, message: response.data.message }
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to approve invite' }
    }
  },

  rejectProjectInvite: async (projectId, inviteId, note = '') => {
    try {
      const response = await api.patch(`/projects/${projectId}/invites/${inviteId}/reject`, { note })
      return { success: true, message: response.data.message }
    } catch (error) {
      return { success: false, error: error.response?.data?.message || 'Failed to reject invite' }
    }
  },
}))
