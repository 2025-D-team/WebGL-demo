/**
 * Game Wrapper
 * Wraps the game with authentication check
 */
import { useEffect } from 'react'

import { useNavigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'
import { Game } from '../game/Game'

export const GameWrapper = () => {
    const { user, isAuthenticated, loading } = useAuth()
    const navigate = useNavigate()

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!loading && !isAuthenticated) {
            navigate('/login')
        }
    }, [loading, isAuthenticated, navigate])

    // Handle loading state
    if (loading) {
        return (
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100vh',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                }}
            >
                <h2 style={{ color: 'white' }}>読み込み中...</h2>
            </div>
        )
    }

    // Must be authenticated to reach here
    if (!isAuthenticated || !user) {
        return null
    }

    // Start game with username
    return <Game playerName={user.username} />
}
