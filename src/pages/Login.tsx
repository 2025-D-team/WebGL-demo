/**
 * Login Page
 * User authentication screen
 */
import React, { useEffect, useState } from 'react'

import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'
import './Auth.scss'

export const Login: React.FC = () => {
    const { login, isAuthenticated, isAdmin, loading: authLoading } = useAuth()
    const navigate = useNavigate()

    const [identifier, setIdentifier] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    // Auto-redirect if already logged in
    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            if (isAdmin) {
                navigate('/admin/dashboard', { replace: true })
            } else {
                navigate('/game', { replace: true })
            }
        }
    }, [authLoading, isAuthenticated, isAdmin, navigate])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const result = await login(identifier, password)

            if (result.success) {
                // Get user data from localStorage (just set by login)
                const userData = localStorage.getItem('user')
                if (userData) {
                    const user = JSON.parse(userData)
                    // Redirect based on admin status
                    if (user.isAdmin) {
                        navigate('/admin/dashboard')
                    } else {
                        navigate('/game')
                    }
                } else {
                    navigate('/game')
                }
            } else {
                setError(result.error || 'Login failed')
            }
        } catch (err) {
            setError('An unexpected error occurred')
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className='auth-container'>
            <div className='auth-box'>
                <div className='auth-header'>
                    <h1>トレジャーアカデミー</h1>
                    <p>アカウントにログイン</p>
                </div>

                <form
                    onSubmit={handleSubmit}
                    className='auth-form'
                >
                    {error && <div className='auth-error'>{error}</div>}

                    <div className='form-group'>
                        <label htmlFor='identifier'>ユーザー名 / メール</label>
                        <input
                            id='identifier'
                            type='text'
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            placeholder='ユーザー名またはメールを入力'
                            required
                            autoComplete='username email'
                            autoFocus
                        />
                    </div>

                    <div className='form-group'>
                        <label htmlFor='password'>パスワード</label>
                        <input
                            id='password'
                            type='password'
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder='パスワードを入力'
                            required
                            minLength={6}
                            autoComplete='current-password'
                        />
                    </div>

                    <button
                        type='submit'
                        className='auth-button'
                        disabled={loading || !identifier || !password}
                    >
                        {loading ? 'ログイン中...' : 'ログイン'}
                    </button>
                </form>

                <div className='auth-footer'>
                    <p>
                        アカウントをお持ちでない方は{' '}
                        <Link
                            to='/register'
                            className='auth-link'
                        >
                            新規登録
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
