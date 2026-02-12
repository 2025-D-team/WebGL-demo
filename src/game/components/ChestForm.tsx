/**
 * Chest Form Modal
 * Form for entering chest details after placing on map
 */
import { useState } from 'react'

import './ChestForm.scss'

interface ChestFormProps {
    rarity: 'wood' | 'common' | 'rare' | 'legendary'
    position: { x: number; y: number }
    difficulty: string
    onSave: (data: ChestFormData) => void
    onClose: () => void
}

export interface ChestFormData {
    rarity: string
    position: { x: number; y: number }
    question: string
    hints: string[]
    expectedAnswer: string
}

export const ChestForm = ({ rarity, position, difficulty, onSave, onClose }: ChestFormProps) => {
    const [question, setQuestion] = useState('')
    const [hintInput, setHintInput] = useState('')
    const [hints, setHints] = useState<string[]>([])
    const [expectedAnswer, setExpectedAnswer] = useState('')
    const [showTooltip, setShowTooltip] = useState(false)

    const rarityLabels: Record<string, string> = {
        wood: '木材',
        common: '普通',
        rare: 'レア',
        legendary: '伝説',
    }

    const handleAddHint = () => {
        if (hintInput.trim()) {
            setHints([...hints, hintInput.trim()])
            setHintInput('')
        }
    }

    const handleRemoveHint = (index: number) => {
        setHints(hints.filter((_, i) => i !== index))
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        if (!question.trim()) {
            alert('問題を入力してください')
            return
        }

        if (!expectedAnswer.trim()) {
            alert('期待される答えを入力してください')
            return
        }

        onSave({
            rarity,
            position,
            question: question.trim(),
            hints,
            expectedAnswer: expectedAnswer.trim(),
        })
    }

    return (
        <div className='chest-form-overlay'>
            <div className='chest-form-modal'>
                <div className='form-header'>
                    <h2>📦 宝箱の詳細</h2>
                    <button
                        className='btn-close'
                        onClick={onClose}
                    >
                        ✖️
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Fixed Info */}
                    <div className='form-section fixed-info'>
                        <div className='info-row'>
                            <span className='info-label'>ランク:</span>
                            <span className='info-value'>{rarityLabels[rarity]}</span>
                        </div>
                        <div className='info-row'>
                            <span className='info-label'>難易度:</span>
                            <span className='info-value'>{difficulty}</span>
                        </div>
                        <div className='info-row'>
                            <span className='info-label'>位置:</span>
                            <span className='info-value'>
                                ({position.x}, {position.y})
                            </span>
                        </div>
                    </div>

                    {/* Question */}
                    <div className='form-section'>
                        <label htmlFor='question'>
                            問題内容 <span className='required'>*</span>
                        </label>
                        <textarea
                            id='question'
                            rows={6}
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder='プログラミング問題を入力してください...'
                            required
                        />
                    </div>

                    {/* Hints */}
                    <div className='form-section'>
                        <label>ヒント (オプション)</label>
                        <div className='hint-input-group'>
                            <input
                                type='text'
                                value={hintInput}
                                onChange={(e) => setHintInput(e.target.value)}
                                placeholder='ヒントを入力...'
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddHint())}
                            />
                            <button
                                type='button'
                                className='btn-add-hint'
                                onClick={handleAddHint}
                            >
                                追加
                            </button>
                        </div>

                        {hints.length > 0 && (
                            <ul className='hint-list'>
                                {hints.map((hint, index) => (
                                    <li key={index}>
                                        <span>{hint}</span>
                                        <button
                                            type='button'
                                            className='btn-remove-hint'
                                            onClick={() => handleRemoveHint(index)}
                                        >
                                            ✖️
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Expected Answer */}
                    <div className='form-section'>
                        <label htmlFor='expectedAnswer'>
                            期待される答え <span className='required'>*</span>
                            <button
                                type='button'
                                className='tooltip-trigger'
                                onMouseEnter={() => setShowTooltip(true)}
                                onMouseLeave={() => setShowTooltip(false)}
                            >
                                ❓
                            </button>
                            {showTooltip && (
                                <div className='tooltip'>
                                    これは、プレイヤーがどの言語を使用して回答しても、AIが採点する際の基準となります。
                                    <br />
                                    期待される結果や解決アプローチを記述してください。
                                </div>
                            )}
                        </label>
                        <textarea
                            id='expectedAnswer'
                            rows={4}
                            value={expectedAnswer}
                            onChange={(e) => setExpectedAnswer(e.target.value)}
                            placeholder='期待される答えや解決方法を入力...'
                            required
                        />
                    </div>

                    {/* Actions */}
                    <div className='form-actions'>
                        <button
                            type='button'
                            className='btn-cancel'
                            onClick={onClose}
                        >
                            キャンセル
                        </button>
                        <button
                            type='submit'
                            className='btn-submit'
                        >
                            保存
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
