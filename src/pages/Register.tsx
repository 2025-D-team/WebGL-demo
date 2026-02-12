/**
 * Register Page
 * New user registration screen
 */
import React, { useEffect, useState } from 'react'

import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'
import './Auth.scss'

export const Register: React.FC = () => {
    const { register, isAuthenticated, isAdmin, loading: authLoading } = useAuth()
    const navigate = useNavigate()

    const [username, setUsername] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
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

        // Validation
        if (password !== confirmPassword) {
            setError('パスワードが一致しません')
            return
        }

        if (password.length < 6) {
            setError('パスワードは6文字以上で入力してください')
            return
        }

        if (username.length < 3) {
            setError('ユーザー名は3文字以上で入力してください')
            return
        }

        setLoading(true)

        try {
            const result = await register(username, email, password)

            if (result.success) {
                navigate('/game')
            } else {
                setError(result.error || 'Registration failed')
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
            <div className='auth-box register-box'>
                <div className='auth-header'>
                    <h1>トレジャーアカデミー</h1>
                    <p>アカウントを作成</p>
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
                        <small>3文字以上</small>
                    </div>

                    <div className='form-group'>
                        <label htmlFor='email'>メールアドレス（任意）</label>
                        <input
                            id='email'
                            type='email'
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder='your.email@example.com'
                            autoComplete='email'
                        />
                        <small>任意 - アカウント復旧用</small>
                    </div>

                    <div className='form-group'>
                        <label htmlFor='password'>パスワード</label>
                        <input
                            id='password'
                            type='password'
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder='パスワードを作成'
                            required
                            minLength={6}
                            autoComplete='new-password'
                        />
                        <small>6文字以上</small>
                    </div>

                    <div className='form-group'>
                        <label htmlFor='confirmPassword'>パスワード確認</label>
                        <input
                            id='confirmPassword'
                            type='password'
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder='パスワードを再入力'
                            required
                            minLength={6}
                            autoComplete='new-password'
                        />
                    </div>

                    <button
                        type='submit'
                        className='auth-button'
                        disabled={loading || !username || !password || !confirmPassword}
                    >
                        {loading ? 'アカウント作成中...' : 'アカウント作成'}
                    </button>
                </form>

                <div className='auth-footer'>
                    <p>
                        既にアカウントをお持ちの方は{' '}
                        <Link
                            to='/login'
                            className='auth-link'
                        >
                            ログイン
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
