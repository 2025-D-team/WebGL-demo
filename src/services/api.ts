/**
 * API Service
 * Handles HTTP requests to the backend
 */
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000'

// Create axios instance
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true, // Include cookies
})

// Add token to requests if available
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// Handle response errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            window.location.href = '/login'
        }
        return Promise.reject(error)
    }
)

// =====================================================
// AUTH API
// =====================================================

export const authAPI = {
    /**
     * Register new user
     */
    register: async (username: string, email: string, password: string) => {
        const response = await api.post('/api/auth/register', { username, email, password })
        return response.data
    },

    /**
     * Login user
     */
    login: async (username: string, password: string) => {
        const response = await api.post('/api/auth/login', { username, password })
        return response.data
    },

    /**
     * Logout user
     */
    logout: async () => {
        const response = await api.post('/api/auth/logout')
        return response.data
    },

    /**
     * Get current user
     */
    me: async () => {
        const response = await api.get('/api/auth/me')
        return response.data
    },

    /**
     * Change password
     */
    changePassword: async (oldPassword: string, newPassword: string) => {
        const response = await api.put('/api/auth/password', { oldPassword, newPassword })
        return response.data
    },

    /**
     * Admin login
     */
    adminLogin: async (username: string, password: string) => {
        const response = await api.post('/api/auth/admin/login', { username, password })
        return response.data
    },
}

// =====================================================
// GAME API
// =====================================================

export const gameAPI = {
    /**
     * Submit answer to chest question
     */
    submitAnswer: async (chestId: string, answer: string, playerId: string) => {
        const response = await api.post('/api/chest/answer', { chestId, answer, playerId })
        return response.data
    },

    /**
     * Get active boss spawns for the game map
     */
    getBossSpawns: async (mapId = 'main') => {
        const response = await api.get(`/api/game/boss-spawns?map=${mapId}`)
        return response.data
    },
}

// =====================================================
// ADMIN API
// =====================================================

export const adminAPI = {
    /**
     * Get all chest spawns
     */
    getChests: async (mapId = 'main') => {
        const response = await api.get(`/api/admin/chests?map=${mapId}`)
        return response.data
    },

    /**
     * Create a new chest spawn with question
     */
    createChest: async (data: {
        x: number
        y: number
        rarity: string
        title: string
        question: string
        hints: string[]
        expectedAnswer: string
    }) => {
        const response = await api.post('/api/admin/chests', data)
        return response.data
    },

    /**
     * Update a chest spawn
     */
    updateChest: async (id: number, data: { x?: number; y?: number; rarity?: string; isActive?: boolean }) => {
        const response = await api.put(`/api/admin/chests/${id}`, data)
        return response.data
    },

    /**
     * Delete a chest spawn
     */
    deleteChest: async (id: number) => {
        const response = await api.delete(`/api/admin/chests/${id}`)
        return response.data
    },

    /**
     * Get chest rarities
     */
    getRarities: async () => {
        const response = await api.get('/api/admin/rarities')
        return response.data
    },

    /**
     * Reload chests into game memory
     */
    reloadChests: async () => {
        const response = await api.post('/api/admin/chests/reload')
        return response.data
    },

    /**
     * Reset a single opened chest (allow respawn)
     */
    resetChest: async (id: number) => {
        const response = await api.post(`/api/admin/chests/${id}/reset`)
        return response.data
    },

    /**
     * Reset all opened chests (allow all to respawn)
     */
    resetAllChests: async () => {
        const response = await api.post('/api/admin/chests/reset-all')
        return response.data
    },
}

// =====================================================
// ADMIN BOSS API
// =====================================================

export const adminBossAPI = {
    /**
     * Get all boss templates
     */
    getTemplates: async () => {
        const response = await api.get('/api/admin/boss-templates')
        return response.data
    },

    /**
     * Create a new boss template
     */
    createTemplate: async (data: {
        name: string
        description?: string
        spriteName?: string
        maxHp?: number
        damagePerCorrect?: number
        timeLimitSeconds?: number
    }) => {
        const response = await api.post('/api/admin/boss-templates', data)
        return response.data
    },

    /**
     * Update a boss template
     */
    updateTemplate: async (id: number, data: Record<string, unknown>) => {
        const response = await api.put(`/api/admin/boss-templates/${id}`, data)
        return response.data
    },

    /**
     * Delete a boss template
     */
    deleteTemplate: async (id: number) => {
        const response = await api.delete(`/api/admin/boss-templates/${id}`)
        return response.data
    },

    /**
     * Get all boss spawns for a map
     */
    getSpawns: async (mapId = 'main') => {
        const response = await api.get(`/api/admin/boss-spawns?map=${mapId}`)
        return response.data
    },

    /**
     * Create a boss spawn (with existing template or create inline with questions)
     * HP = questions.length * 10, damagePerCorrect = 10
     */
    createSpawn: async (data: {
        x: number
        y: number
        bossTemplateId?: number
        newBoss?: {
            name: string
            description?: string
            timeLimitSeconds?: number
            questions: Array<{
                title: string
                description: string
                difficulty: string
                hints: string[]
                expectedAnswer: string
            }>
        }
    }) => {
        const response = await api.post('/api/admin/boss-spawns', data)
        return response.data
    },

    /**
     * Update a boss spawn
     */
    updateSpawn: async (id: number, data: Record<string, unknown>) => {
        const response = await api.put(`/api/admin/boss-spawns/${id}`, data)
        return response.data
    },

    /**
     * Delete a boss spawn
     */
    deleteSpawn: async (id: number) => {
        const response = await api.delete(`/api/admin/boss-spawns/${id}`)
        return response.data
    },

    /**
     * Reload boss spawns and notify all connected players
     */
    reloadBosses: async () => {
        const response = await api.post('/api/admin/boss-spawns/reload')
        return response.data
    },

    /**
     * Reset a defeated boss (restore full HP)
     */
    resetBoss: async (id: number) => {
        const response = await api.post(`/api/admin/boss-spawns/${id}/reset`)
        return response.data
    },

    /**
     * Generate questions using AI for boss creation
     * Returns array of questions with title, description, difficulty, hints, expectedAnswer
     */
    generateQuestions: async (data: {
        bossName: string
        bossDescription?: string
        difficulties: {
            easy?: number
            medium?: number
            hard?: number
            expert?: number
        }
    }) => {
        const response = await api.post('/api/admin/boss-questions/generate', data)
        return response.data
    },
}

export default api
