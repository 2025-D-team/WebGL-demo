/**
 * Main App Component
 * Handles routing and authentication
 */
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { AuthProvider, useAuth } from './context/AuthContext'
import { AdminDashboard } from './pages/AdminDashboard'
import { GameWrapper } from './pages/GameWrapper'
import { Login } from './pages/Login'
import { Register } from './pages/Register'

/**
 * Smart default redirect based on auth state
 */
const DefaultRedirect = () => {
    const { isAuthenticated, isAdmin, loading } = useAuth()

    if (loading) return null

    if (isAuthenticated) {
        return (
            <Navigate
                to={isAdmin ? '/admin/dashboard' : '/game'}
                replace
            />
        )
    }

    return (
        <Navigate
            to='/login'
            replace
        />
    )
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    {/* Auth routes */}
                    <Route
                        path='/login'
                        element={<Login />}
                    />
                    <Route
                        path='/register'
                        element={<Register />}
                    />

                    {/* Game route */}
                    <Route
                        path='/game'
                        element={<GameWrapper />}
                    />

                    {/* Admin route */}
                    <Route
                        path='/admin/dashboard'
                        element={<AdminDashboard />}
                    />

                    {/* Default route — smart redirect */}
                    <Route
                        path='/'
                        element={<DefaultRedirect />}
                    />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    )
}

export default App
