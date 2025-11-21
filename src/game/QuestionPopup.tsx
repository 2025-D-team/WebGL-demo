import { useEffect, useState } from 'react'

interface QuestionPopupProps {
    question: string
    timeLimit: number
    onSubmit: (answer: string) => void
    onClose: () => void
}

export const QuestionPopup = ({ question, timeLimit, onSubmit, onClose }: QuestionPopupProps) => {
    const [answer, setAnswer] = useState('')
    const [timeLeft, setTimeLeft] = useState(timeLimit)

    useEffect(() => {
        // Reset timer when question/timeLimit changes
        setTimeLeft(timeLimit)

        // Start countdown timer
        const interval = setInterval(() => {
            setTimeLeft((prev) => {
                const newTime = prev - 100
                if (newTime <= 100) {
                    clearInterval(interval)
                    onClose() // Auto close when time expires
                    return 0
                }
                return newTime
            })
        }, 100)

        return () => {
            console.log('🛑 Timer cleanup')
            clearInterval(interval)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timeLimit])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (answer.trim()) {
            onSubmit(answer.trim())
        }
    }

    const progress = (timeLeft / timeLimit) * 100

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10001,
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: 'white',
                    borderRadius: 16,
                    padding: '24px',
                    minWidth: 400,
                    maxWidth: 500,
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header with timer */}
                <div
                    style={{
                        marginBottom: 20,
                        paddingBottom: 16,
                        borderBottom: '2px solid #eee',
                    }}
                >
                    <h2
                        style={{
                            margin: 0,
                            fontSize: 20,
                            color: '#333',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}
                    >
                        <span>🎯 問題を解いてください</span>
                        <span
                            style={{
                                fontSize: 18,
                                color: progress < 30 ? '#ff4444' : '#667eea',
                                fontWeight: 'bold',
                            }}
                        >
                            {Math.ceil(timeLeft / 1000)}s
                        </span>
                    </h2>

                    {/* Progress bar */}
                    <div
                        style={{
                            marginTop: 12,
                            height: 6,
                            background: '#eee',
                            borderRadius: 3,
                            overflow: 'hidden',
                        }}
                    >
                        <div
                            style={{
                                height: '100%',
                                background:
                                    progress < 30 ?
                                        'linear-gradient(90deg, #ff4444, #ff6666)'
                                    :   'linear-gradient(90deg, #667eea, #764ba2)',
                                width: `${progress}%`,
                                transition: 'width 0.1s linear',
                            }}
                        />
                    </div>
                </div>

                {/* Question */}
                <div
                    style={{
                        marginBottom: 24,
                        textAlign: 'center',
                    }}
                >
                    <div
                        style={{
                            fontSize: 48,
                            fontWeight: 'bold',
                            color: '#333',
                            fontFamily: 'monospace',
                            letterSpacing: 4,
                        }}
                    >
                        {question}
                    </div>
                    <div
                        style={{
                            marginTop: 8,
                            fontSize: 14,
                            color: '#999',
                        }}
                    >
                        下に答えを入力してください
                    </div>
                </div>

                {/* Answer form */}
                <form onSubmit={handleSubmit}>
                    <input
                        type='number'
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        placeholder='あなたの答え'
                        autoFocus
                        style={{
                            width: '100%',
                            padding: '16px',
                            fontSize: 24,
                            textAlign: 'center',
                            border: '2px solid #ddd',
                            borderRadius: 8,
                            outline: 'none',
                            fontFamily: 'monospace',
                            boxSizing: 'border-box',
                        }}
                        onFocus={(e) => (e.target.style.borderColor = '#667eea')}
                        onBlur={(e) => (e.target.style.borderColor = '#ddd')}
                    />

                    {/* Buttons */}
                    <div
                        style={{
                            marginTop: 20,
                            display: 'flex',
                            gap: 12,
                        }}
                    >
                        <button
                            type='button'
                            onClick={onClose}
                            style={{
                                flex: 1,
                                padding: '12px',
                                fontSize: 16,
                                fontWeight: '600',
                                border: '2px solid #ddd',
                                borderRadius: 8,
                                background: 'white',
                                color: '#666',
                                cursor: 'pointer',
                            }}
                        >
                            キャンセル
                        </button>
                        <button
                            type='submit'
                            disabled={!answer.trim()}
                            style={{
                                flex: 1,
                                padding: '12px',
                                fontSize: 16,
                                fontWeight: '600',
                                border: 'none',
                                borderRadius: 8,
                                background:
                                    answer.trim() ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#ddd',
                                color: 'white',
                                cursor: answer.trim() ? 'pointer' : 'not-allowed',
                            }}
                        >
                            送信
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
