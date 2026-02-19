/**
 * Authentication Context
 * Manages user authentication state globally
 */
import React, { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

import { authAPI } from '../services/api'

interface User {
    id: number
    username: string
    email?: string
    isAdmin?: boolean
    totalScore?: number
    chestsOpened?: number
    bossesDefeated?: number
    lastPosition?: {
        x: number | null
        y: number | null
        direction: string | null
    }
}

interface AuthContextType {
    user: User | null
    token: string | null
    loading: boolean
    login: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>
    register: (username: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>
    logout: () => void
    isAuthenticated: boolean
    isAdmin: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider')
    }
    return context
}

interface AuthProviderProps {
    children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null)
    const [token, setToken] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    // Initialize auth state from localStorage
    useEffect(() => {
        const initAuth = async () => {
            const storedToken = localStorage.getItem('token')
            const storedUser = localStorage.getItem('user')

            if (storedToken && storedUser) {
                try {
                    setToken(storedToken)
                    setUser(JSON.parse(storedUser))

                    // Verify token is still valid
                    const response = await authAPI.me()
                    if (response.success) {
                        setUser(response.user)
                        localStorage.setItem('user', JSON.stringify(response.user))
                    } else {
                        // Token invalid, clear auth
                        localStorage.removeItem('token')
                        localStorage.removeItem('user')
                        setToken(null)
                        setUser(null)
                    }
                } catch (error) {
                    console.error('Auth verification failed:', error)
                    localStorage.removeItem('token')
                    localStorage.removeItem('user')
                    setToken(null)
                    setUser(null)
                }
            }

            setLoading(false)
        }

        initAuth()
    }, [])

    const login = async (identifier: string, password: string) => {
        try {
            const response = await authAPI.login(identifier, password)

            if (response.success) {
                setToken(response.token)
                setUser(response.user)
                localStorage.setItem('token', response.token)
                localStorage.setItem('user', JSON.stringify(response.user))
                return { success: true }
            } else {
                return { success: false, error: response.error || 'Login failed' }
            }
        } catch (error: unknown) {
            const err = error as { response?: { data?: { error?: string } } }
            console.error('Login error:', error)
            return {
                success: false,
                error: err.response?.data?.error || 'Network error',
            }
        }
    }

    const register = async (username: string, email: string, password: string) => {
        try {
            const response = await authAPI.register(username, email, password)

            if (response.success) {
                setToken(response.token)
                setUser(response.user)
                localStorage.setItem('token', response.token)
                localStorage.setItem('user', JSON.stringify(response.user))
                return { success: true }
            } else {
                return { success: false, error: response.error || 'Registration failed' }
            }
        } catch (error: unknown) {
            const err = error as { response?: { data?: { error?: string } } }
            console.error('Register error:', error)
            return {
                success: false,
                error: err.response?.data?.error || 'Network error',
            }
        }
    }

    const logout = () => {
        authAPI.logout().catch(console.error)
        setToken(null)
        setUser(null)
        localStorage.removeItem('token')
        localStorage.removeItem('user')
    }

    const value: AuthContextType = {
        user,
        token,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user && !!token,
        isAdmin: !!user && !!user.isAdmin,
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
