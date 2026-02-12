/**
 * Admin Dashboard
 * Main admin panel interface
 */
import { useEffect } from 'react'

import { useNavigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'

export const AdminDashboard = () => {
    const { user, isAdmin, loading, logout } = useAuth()
    const navigate = useNavigate()

    // Redirect if not admin
    useEffect(() => {
        if (!loading && !isAdmin) {
            navigate('/login')
        }
    }, [loading, isAdmin, navigate])

    // Loading state
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

    // Not authenticated as admin
    if (!isAdmin || !user) {
        return null
    }

    const handleLogout = () => {
        logout()
        navigate('/login')
    }

    return (
        <div
            style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                padding: '2rem',
            }}
        >
            <div
                style={{
                    maxWidth: '1200px',
                    margin: '0 auto',
                    background: 'white',
                    borderRadius: '12px',
                    padding: '2rem',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
                }}
            >
                {/* Header */}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '2rem',
                        paddingBottom: '1.5rem',
                        borderBottom: '2px solid #e2e8f0',
                    }}
                >
                    <div>
                        <h1 style={{ margin: 0, color: '#2d3748', fontSize: '2rem' }}>
                            🎮 Treasure Academy - 管理パネル
                        </h1>
                        <p style={{ margin: '0.5rem 0 0 0', color: '#718096' }}>
                            ようこそ、{user.username} さん (管理者)
                        </p>
                    </div>
                    <button
                        onClick={handleLogout}
                        style={{
                            padding: '0.75rem 1.5rem',
                            background: '#e53e3e',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#c53030'
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#e53e3e'
                        }}
                    >
                        ログアウト
                    </button>
                </div>

                {/* Content */}
                <div
                    style={{
                        textAlign: 'center',
                        padding: '4rem 2rem',
                    }}
                >
                    <h2
                        style={{
                            fontSize: '3rem',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            margin: '0 0 1rem 0',
                        }}
                    >
                        Hello World! 🌍
                    </h2>
                    <p style={{ color: '#718096', fontSize: '1.2rem', margin: 0 }}>管理機能は開発中です...</p>
                    <p style={{ color: '#a0aec0', fontSize: '0.95rem', marginTop: '2rem' }}>
                        Coming soon: 宝箱設定、質問管理、レイドボスシステム
                    </p>
                </div>

                {/* Admin Info */}
                <div
                    style={{
                        marginTop: '3rem',
                        padding: '1.5rem',
                        background: '#f7fafc',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0',
                    }}
                >
                    <h3 style={{ marginTop: 0, color: '#2d3748' }}>システム情報</h3>
                    <ul style={{ color: '#4a5568', lineHeight: '1.8' }}>
                        <li>
                            <strong>Admin ID:</strong> {user.id}
                        </li>
                        <li>
                            <strong>Username:</strong> {user.username}
                        </li>
                        <li>
                            <strong>Email:</strong> {user.email || 'N/A'}
                        </li>
                        <li>
                            <strong>Admin:</strong> {user.isAdmin ? 'Yes' : 'No'}
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    )
}
