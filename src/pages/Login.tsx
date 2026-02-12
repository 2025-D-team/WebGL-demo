/**
 * Login Page
 * User authentication screen
 */
import React, { useState } from 'react'

import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'
import './Auth.scss'

export const Login: React.FC = () => {
    const { login } = useAuth()
    const navigate = useNavigate()

    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const result = await login(username, password)

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
                    <h1>🏆 トレジャーアカデミー</h1>
                    <p>アカウントにログイン</p>
                </div>

                <form
                    onSubmit={handleSubmit}
                    className='auth-form'
                >
                    {error && <div className='auth-error'>{error}</div>}

                    <div className='form-group'>
                        <label htmlFor='username'>ユーザー名</label>
                        <input
                            id='username'
                            type='text'
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder='ユーザー名を入力'
                            required
                            minLength={3}
                            autoComplete='username'
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
                        disabled={loading || !username || !password}
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
