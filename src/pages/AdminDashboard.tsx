/**
 * Admin Dashboard
 * Main admin panel interface with sidebar navigation
 */
import { useEffect, useState } from 'react'

import { useNavigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'
import { BossManager } from '../game/components/BossManager'
import { ChestManager } from '../game/components/ChestManager'
import './AdminDashboard.scss'

type MenuTab = 'chests' | 'bosses'

export const AdminDashboard = () => {
    const { user, isAdmin, loading, logout } = useAuth()
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState<MenuTab>('chests')

    // Redirect if not admin
    useEffect(() => {
        if (!loading && !isAdmin) {
            navigate('/login')
        }
    }, [loading, isAdmin, navigate])

    // Loading state
    if (loading) {
        return (
            <div className='admin-loading'>
                <h2>読み込み中...</h2>
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
        <div className='admin-dashboard'>
            {/* Sidebar */}
            <aside className='admin-sidebar'>
                <div className='sidebar-header'>
                    <h2>🎮 管理パネル</h2>
                    <div className='admin-user'>
                        <span className='admin-badge'>Admin</span>
                        <span className='username'>{user.username}</span>
                    </div>
                </div>

                <nav className='sidebar-nav'>
                    <button
                        className={`nav-item ${activeTab === 'chests' ? 'active' : ''}`}
                        onClick={() => setActiveTab('chests')}
                    >
                        <span className='icon'>📦</span>
                        <span className='label'>宝箱管理</span>
                    </button>

                    <button
                        className={`nav-item ${activeTab === 'bosses' ? 'active' : ''}`}
                        onClick={() => setActiveTab('bosses')}
                    >
                        <span className='icon'>👹</span>
                        <span className='label'>ボス管理</span>
                    </button>
                </nav>

                <div className='sidebar-footer'>
                    <button
                        className='logout-btn'
                        onClick={handleLogout}
                    >
                        <span>🚪</span>
                        ログアウト
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className='admin-content'>
                <div className='content-header'>
                    <h1>
                        {activeTab === 'chests' && '📦 宝箱配置エディター'}
                        {activeTab === 'bosses' && '👹 ボス管理'}
                    </h1>
                </div>

                <div className='content-body'>
                    {activeTab === 'chests' && <ChestManager />}
                    {activeTab === 'bosses' && <BossManager />}
                </div>
            </main>
        </div>
    )
}
