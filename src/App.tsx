/**
 * Main App Component
 * Handles routing and authentication
 */
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { AuthProvider } from './context/AuthContext'
import { GameWrapper } from './pages/GameWrapper'
import { Login } from './pages/Login'
import { Register } from './pages/Register'

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    <Route
                        path='/login'
                        element={<Login />}
                    />
                    <Route
                        path='/register'
                        element={<Register />}
                    />
                    <Route
                        path='/game'
                        element={<GameWrapper />}
                    />
                    <Route
                        path='/'
                        element={
                            <Navigate
                                to='/login'
                                replace
                            />
                        }
                    />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    )
}

export default App
