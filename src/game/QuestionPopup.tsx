import { useEffect, useState } from 'react'

interface QuestionPopupProps {
    question: string
    timeLimit: number
    onSubmit: (answer: string) => void
    onCancel: () => void // Called when user cancels (click outside or cancel button)
    isGrading?: boolean
}

interface QuestionData {
    id: number
    title: string
    description: string
    language: string
    difficulty: string
    hints: string[]
}

export const QuestionPopup = ({ question, timeLimit, onSubmit, onCancel, isGrading = false }: QuestionPopupProps) => {
    const [answer, setAnswer] = useState('')
    const [timeLeft, setTimeLeft] = useState(timeLimit)

    // Parse question data (expecting JSON string)
    const questionData: QuestionData = (() => {
        try {
            return JSON.parse(question)
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (e) {
            // Fallback to old format if not JSON
            return {
                id: 0,
                title: '問題',
                description: question,
                language: 'javascript',
                difficulty: 'easy',
                hints: [],
            }
        }
    })()

    useEffect(() => {
        // Reset timer when question/timeLimit changes
        setTimeLeft(timeLimit)

        // Start countdown timer
        const interval = setInterval(() => {
            setTimeLeft((prev) => {
                const newTime = prev - 100
                if (newTime <= 100) {
                    clearInterval(interval)
                    // Don't call onCancel here - timeout is handled by backend
                    return 0
                }
                return newTime
            })
        }, 100)

        return () => {
            console.log('🛑 Timer cleanup')
            clearInterval(interval)
        }
    }, [timeLimit])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (answer.trim()) {
            onSubmit(answer.trim())
        }
    }

    const progress = (timeLeft / timeLimit) * 100

    // Format time as MM:SS
    const formatTime = (ms: number) => {
        const totalSeconds = Math.ceil(ms / 1000)
        const minutes = Math.floor(totalSeconds / 60)
        const seconds = totalSeconds % 60
        return `${minutes}:${seconds.toString().padStart(2, '0')}`
    }

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
            onClick={onCancel}
        >
            <div
                style={{
                    background: 'white',
                    borderRadius: 16,
                    padding: '24px',
                    minWidth: '90vw',
                    maxWidth: 1400,
                    minHeight: '80vh',
                    maxHeight: '90vh',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
                    display: 'flex',
                    flexDirection: 'column',
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
                            fontSize: 24,
                            color: '#333',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}
                    >
                        <span>💻 {questionData.title}</span>
                        <span
                            style={{
                                fontSize: 20,
                                color: progress < 30 ? '#ff4444' : '#667eea',
                                fontWeight: 'bold',
                                fontFamily: 'monospace',
                            }}
                        >
                            ⏱ {formatTime(timeLeft)}
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

                {/* Main content: 2 columns layout */}
                <div
                    style={{
                        display: 'flex',
                        gap: 24,
                        flex: 1,
                        overflow: 'hidden',
                    }}
                >
                    {/* Left column: Description */}
                    <div
                        style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'auto',
                            paddingRight: 12,
                        }}
                    >
                        <h3
                            style={{
                                margin: '0 0 16px 0',
                                fontSize: 18,
                                color: '#667eea',
                                fontWeight: '600',
                            }}
                        >
                            📝 問題の説明
                        </h3>

                        <div
                            style={{
                                background: '#f8f9fa',
                                padding: 20,
                                borderRadius: 12,
                                fontSize: 15,
                                lineHeight: '1.8',
                                color: '#333',
                                marginBottom: 20,
                                whiteSpace: 'pre-wrap',
                            }}
                        >
                            {questionData.description}
                        </div>

                        {/* Hints section */}
                        {questionData.hints.length > 0 && (
                            <div>
                                <h4
                                    style={{
                                        margin: '0 0 12px 0',
                                        fontSize: 16,
                                        color: '#ff9800',
                                        fontWeight: '600',
                                    }}
                                >
                                    💡 ヒント
                                </h4>
                                <div
                                    style={{
                                        background: '#fff3e0',
                                        padding: 16,
                                        borderRadius: 12,
                                        borderLeft: '4px solid #ff9800',
                                    }}
                                >
                                    {questionData.hints.map((hint, index) => (
                                        <div
                                            key={index}
                                            style={{
                                                fontSize: 14,
                                                color: '#666',
                                                marginBottom: index < questionData.hints.length - 1 ? 8 : 0,
                                                lineHeight: '1.6',
                                            }}
                                        >
                                            • {hint}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Difficulty badge */}
                        <div
                            style={{
                                marginTop: 'auto',
                                paddingTop: 16,
                            }}
                        >
                            <span
                                style={{
                                    display: 'inline-block',
                                    padding: '6px 12px',
                                    borderRadius: 6,
                                    fontSize: 12,
                                    fontWeight: '600',
                                    background:
                                        questionData.difficulty === 'easy' ? '#4caf50'
                                        : questionData.difficulty === 'medium' ? '#ff9800'
                                        : '#f44336',
                                    color: 'white',
                                }}
                            >
                                {questionData.difficulty.toUpperCase()}
                            </span>
                            <span
                                style={{
                                    marginLeft: 12,
                                    padding: '6px 12px',
                                    borderRadius: 6,
                                    fontSize: 12,
                                    fontWeight: '600',
                                    background: '#2196f3',
                                    color: 'white',
                                }}
                            >
                                {questionData.language}
                            </span>
                        </div>
                    </div>

                    {/* Right column: Code editor */}
                    <div
                        style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        <h3
                            style={{
                                margin: '0 0 16px 0',
                                fontSize: 18,
                                color: '#667eea',
                                fontWeight: '600',
                            }}
                        >
                            ⌨️ あなたのコード
                        </h3>

                        <form
                            onSubmit={handleSubmit}
                            style={{
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                            }}
                        >
                            <textarea
                                value={answer}
                                onChange={(e) => setAnswer(e.target.value)}
                                placeholder='ここにコードを書いてください...'
                                autoFocus
                                spellCheck={false}
                                style={{
                                    flex: 1,
                                    padding: '16px',
                                    fontSize: 14,
                                    border: '2px solid #ddd',
                                    borderRadius: 12,
                                    outline: 'none',
                                    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                                    boxSizing: 'border-box',
                                    resize: 'none',
                                    background: '#1e1e1e',
                                    color: '#d4d4d4',
                                    lineHeight: '1.6',
                                    minHeight: 300,
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
                                    onClick={onCancel}
                                    style={{
                                        flex: 1,
                                        padding: '14px',
                                        fontSize: 16,
                                        fontWeight: '600',
                                        border: '2px solid #ddd',
                                        borderRadius: 8,
                                        background: 'white',
                                        color: '#666',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = '#f5f5f5'
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'white'
                                    }}
                                >
                                    ❌ キャンセル
                                </button>
                                <button
                                    type='submit'
                                    disabled={!answer.trim() || isGrading}
                                    style={{
                                        flex: 1,
                                        padding: '14px',
                                        fontSize: 16,
                                        fontWeight: '600',
                                        border: 'none',
                                        borderRadius: 8,
                                        background:
                                            answer.trim() && !isGrading ?
                                                'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                            :   '#ddd',
                                        color: 'white',
                                        cursor: answer.trim() && !isGrading ? 'pointer' : 'not-allowed',
                                        transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={(e) => {
                                        if (answer.trim() && !isGrading) {
                                            e.currentTarget.style.transform = 'translateY(-2px)'
                                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)'
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)'
                                        e.currentTarget.style.boxShadow = 'none'
                                    }}
                                >
                                    {isGrading ? '🤖 採点中...' : '✅ 提出する'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
                
                {/* Grading Overlay */}
                {isGrading && (
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0, 0, 0, 0.7)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 20,
                            zIndex: 10,
                        }}
                    >
                        <div
                            style={{
                                background: 'white',
                                padding: '40px 60px',
                                borderRadius: 16,
                                textAlign: 'center',
                                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                            }}
                        >
                            <div
                                style={{
                                    fontSize: 48,
                                    marginBottom: 16,
                                    animation: 'bounce 1s infinite',
                                }}
                            >
                                🤖
                            </div>
                            <div
                                style={{
                                    fontSize: 24,
                                    fontWeight: 'bold',
                                    color: '#667eea',
                                    marginBottom: 8,
                                }}
                            >
                                採点中...
                            </div>
                            <div
                                style={{
                                    fontSize: 14,
                                    color: '#666',
                                }}
                            >
                                AIがコードを評価しています
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
