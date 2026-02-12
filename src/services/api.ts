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
}

export default api
