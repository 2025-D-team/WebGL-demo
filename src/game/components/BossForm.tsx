/**
 * Boss Form Modal
 * Form for creating a boss spawn with inline question management
 * Admin can add questions manually or generate them with AI
 * HP = questions.length * 10, damagePerCorrect = 10 (auto-calculated)
 */
import { useState } from 'react'

import { adminBossAPI } from '../../services/api'
import './BossForm.scss'

/** Question format matching the project schema */
interface BossQuestion {
    title: string
    description: string
    difficulty: 'easy' | 'medium' | 'hard' | 'expert'
    hints: string[]
    expectedAnswer: string
}

interface BossFormProps {
    position: { x: number; y: number }
    onSave: (data: BossFormData) => void
    onClose: () => void
    isSaving?: boolean
}

export interface BossFormData {
    position: { x: number; y: number }
    bossTemplateId?: number
    newBoss?: {
        name: string
        description?: string
        timeLimitSeconds: number
        questions: BossQuestion[]
    }
}

type QuestionTab = 'manual' | 'ai'

const DIFFICULTY_LABELS: Record<string, string> = {
    easy: '🟢 初級',
    medium: '🟡 中級',
    hard: '🟠 上級',
    expert: '🔴 超級',
}

const EMPTY_QUESTION: BossQuestion = {
    title: '',
    description: '',
    difficulty: 'easy',
    hints: [''],
    expectedAnswer: '',
}

export const BossForm = ({ position, onSave, onClose, isSaving = false }: BossFormProps) => {
    // Boss info fields
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [timeLimitSeconds, setTimeLimitSeconds] = useState(600)

    // Questions state
    const [questions, setQuestions] = useState<BossQuestion[]>([])
    const [questionTab, setQuestionTab] = useState<QuestionTab>('manual')

    // Manual question editing
    const [editingQuestion, setEditingQuestion] = useState<BossQuestion>({ ...EMPTY_QUESTION })
    const [editingIndex, setEditingIndex] = useState<number | null>(null)

    // AI generation state
    const [aiDifficulties, setAiDifficulties] = useState({ easy: 0, medium: 0, hard: 0, expert: 0 })
    const [isGenerating, setIsGenerating] = useState(false)
    const [generatedQuestions, setGeneratedQuestions] = useState<BossQuestion[] | null>(null)

    // Computed
    const totalAiPending = aiDifficulties.easy + aiDifficulties.medium + aiDifficulties.hard + aiDifficulties.expert
    const totalQuestions = questions.length
    const projectedTotal = totalQuestions + totalAiPending
    const projectedHp = projectedTotal * 10

    // --- Manual Question Handlers ---
    const handleAddOrUpdateQuestion = () => {
        if (!editingQuestion.title.trim() || !editingQuestion.expectedAnswer.trim()) {
            alert('タイトルと期待回答は必須です')
            return
        }

        const cleaned: BossQuestion = {
            ...editingQuestion,
            title: editingQuestion.title.trim(),
            description: editingQuestion.description.trim(),
            expectedAnswer: editingQuestion.expectedAnswer.trim(),
            hints: editingQuestion.hints.filter((h) => h.trim() !== '').map((h) => h.trim()),
        }

        if (editingIndex !== null) {
            setQuestions((prev) => prev.map((q, i) => (i === editingIndex ? cleaned : q)))
            setEditingIndex(null)
        } else {
            setQuestions((prev) => [...prev, cleaned])
        }
        setEditingQuestion({ ...EMPTY_QUESTION })
    }

    const handleEditQuestion = (index: number) => {
        const q = questions[index]
        setEditingQuestion({ ...q, hints: q.hints.length > 0 ? [...q.hints] : [''] })
        setEditingIndex(index)
        setQuestionTab('manual')
    }

    const handleDeleteQuestion = (index: number) => {
        setQuestions((prev) => prev.filter((_, i) => i !== index))
        if (editingIndex === index) {
            setEditingIndex(null)
            setEditingQuestion({ ...EMPTY_QUESTION })
        }
    }

    const handleCancelEdit = () => {
        setEditingIndex(null)
        setEditingQuestion({ ...EMPTY_QUESTION })
    }

    const handleHintChange = (hintIndex: number, value: string) => {
        setEditingQuestion((prev) => ({
            ...prev,
            hints: prev.hints.map((h, i) => (i === hintIndex ? value : h)),
        }))
    }

    const handleAddHint = () => {
        if (editingQuestion.hints.length < 5) {
            setEditingQuestion((prev) => ({ ...prev, hints: [...prev.hints, ''] }))
        }
    }

    const handleRemoveHint = (hintIndex: number) => {
        setEditingQuestion((prev) => ({
            ...prev,
            hints: prev.hints.filter((_, i) => i !== hintIndex),
        }))
    }

    // --- AI Generation Handlers ---
    const totalAiQuestions = totalAiPending

    const handleGenerateAI = async () => {
        if (totalAiQuestions === 0) {
            alert('少なくとも1問の難易度を設定してください')
            return
        }
        if (!name.trim()) {
            alert('先にボス名を入力してください')
            return
        }

        setIsGenerating(true)
        setGeneratedQuestions(null)
        try {
            const result = await adminBossAPI.generateQuestions({
                bossName: name.trim(),
                bossDescription: description.trim() || undefined,
                difficulties: aiDifficulties,
            })
            if (result.success && result.questions) {
                setGeneratedQuestions(result.questions)
            } else {
                alert(result.error || 'AI質問生成に失敗しました')
            }
        } catch (error) {
            console.error('AI generation error:', error)
            alert('AI質問生成に失敗しました')
        } finally {
            setIsGenerating(false)
        }
    }

    const handleAcceptGenerated = () => {
        if (generatedQuestions) {
            setQuestions((prev) => [...prev, ...generatedQuestions])
            setGeneratedQuestions(null)
            setAiDifficulties({ easy: 0, medium: 0, hard: 0, expert: 0 })
        }
    }

    const handleDiscardGenerated = () => {
        setGeneratedQuestions(null)
    }

    // --- Form Submit ---
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        if (!name.trim()) {
            alert('ボス名を入力してください')
            return
        }
        if (questions.length === 0 && totalAiPending === 0) {
            alert('少なくとも1つの質問を追加してください')
            return
        }
        if (totalAiPending > 0) {
            alert('AI生成の質問がまだ生成されていません。先に「AIで質問を生成」を実行してください。')
            return
        }

        onSave({
            position,
            newBoss: {
                name: name.trim(),
                description: description.trim() || undefined,
                timeLimitSeconds,
                questions,
            },
        })
    }

    return (
        <div className='boss-form-overlay'>
            <div className='boss-form-modal'>
                <div className='form-header'>
                    <h2>👹 ボススポーンの設定</h2>
                    <button
                        className='btn-close'
                        onClick={onClose}
                    >
                        ✖️
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Position & Auto-calculated Stats */}
                    <div className='form-section fixed-info'>
                        <div className='info-row'>
                            <span className='info-label'>位置:</span>
                            <span className='info-value'>
                                ({position.x}, {position.y})
                            </span>
                        </div>
                        <div className='info-row'>
                            <span className='info-label'>❤️ HP:</span>
                            <span className='info-value hp-value'>{projectedHp > 0 ? projectedHp : '—'}</span>
                        </div>
                        <div className='info-row'>
                            <span className='info-label'>📝 質問数:</span>
                            <span className='info-value'>
                                {projectedTotal > 0 ? `${projectedTotal}問` : '—'}
                                {totalAiPending > 0 &&
                                    totalQuestions > 0 &&
                                    ` (手動${totalQuestions} + AI${totalAiPending})`}
                            </span>
                        </div>
                        <div className='info-row'>
                            <span className='info-label'>⚔️ 正解ダメージ:</span>
                            <span className='info-value'>10</span>
                        </div>
                    </div>

                    {/* Boss Name */}
                    <div className='form-section'>
                        <label htmlFor='boss-name'>
                            ボス名 <span className='required'>*</span>
                        </label>
                        <input
                            id='boss-name'
                            type='text'
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder='例: ダークドラゴン、スライムキング'
                            required
                            autoFocus
                        />
                    </div>

                    {/* Description */}
                    <div className='form-section'>
                        <label htmlFor='boss-desc'>説明</label>
                        <textarea
                            id='boss-desc'
                            rows={2}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder='ボスの説明...'
                        />
                    </div>

                    {/* Time Limit */}
                    <div className='form-section'>
                        <label htmlFor='boss-time'>
                            ⏱️ 制限時間(秒) <span className='hint-text'>— 超過するとデスポーンします</span>
                        </label>
                        <input
                            id='boss-time'
                            type='number'
                            value={timeLimitSeconds}
                            onChange={(e) => setTimeLimitSeconds(Number(e.target.value))}
                            min={30}
                            step={30}
                        />
                    </div>

                    {/* ===== QUESTIONS SECTION ===== */}
                    <div className='questions-section'>
                        <div className='questions-header'>
                            <h3>📝 質問管理</h3>
                            <span className='question-count-badge'>
                                {projectedTotal}問 = HP {projectedHp}
                            </span>
                        </div>

                        {/* Question Tabs: Manual / AI */}
                        <div className='question-tabs'>
                            <button
                                type='button'
                                className={`question-tab ${questionTab === 'manual' ? 'active' : ''}`}
                                onClick={() => setQuestionTab('manual')}
                            >
                                ✏️ 手動入力
                            </button>
                            <button
                                type='button'
                                className={`question-tab ${questionTab === 'ai' ? 'active' : ''}`}
                                onClick={() => setQuestionTab('ai')}
                            >
                                🤖 AI生成
                            </button>
                        </div>

                        {questionTab === 'manual' ?
                            /* --- Manual Question Input --- */
                            <div className='manual-question-form'>
                                <div className='q-field'>
                                    <label>
                                        タイトル <span className='required'>*</span>
                                    </label>
                                    <input
                                        type='text'
                                        value={editingQuestion.title}
                                        onChange={(e) =>
                                            setEditingQuestion((prev) => ({ ...prev, title: e.target.value }))
                                        }
                                        placeholder='質問のタイトル'
                                    />
                                </div>

                                <div className='q-field'>
                                    <label>説明</label>
                                    <textarea
                                        rows={2}
                                        value={editingQuestion.description}
                                        onChange={(e) =>
                                            setEditingQuestion((prev) => ({
                                                ...prev,
                                                description: e.target.value,
                                            }))
                                        }
                                        placeholder='質問の詳細説明...'
                                    />
                                </div>

                                <div className='q-row'>
                                    <div className='q-field'>
                                        <label>難易度</label>
                                        <select
                                            value={editingQuestion.difficulty}
                                            onChange={(e) =>
                                                setEditingQuestion((prev) => ({
                                                    ...prev,
                                                    difficulty: e.target.value as BossQuestion['difficulty'],
                                                }))
                                            }
                                        >
                                            <option value='easy'>🟢 初級</option>
                                            <option value='medium'>🟡 中級</option>
                                            <option value='hard'>🟠 上級</option>
                                            <option value='expert'>🔴 超級</option>
                                        </select>
                                    </div>
                                    <div className='q-field'>
                                        <label>
                                            期待回答 <span className='required'>*</span>
                                        </label>
                                        <input
                                            type='text'
                                            value={editingQuestion.expectedAnswer}
                                            onChange={(e) =>
                                                setEditingQuestion((prev) => ({
                                                    ...prev,
                                                    expectedAnswer: e.target.value,
                                                }))
                                            }
                                            placeholder='正解のコード/テキスト'
                                        />
                                    </div>
                                </div>

                                {/* Hints */}
                                <div className='q-field'>
                                    <label>
                                        ヒント
                                        <button
                                            type='button'
                                            className='btn-add-hint'
                                            onClick={handleAddHint}
                                            disabled={editingQuestion.hints.length >= 5}
                                        >
                                            + 追加
                                        </button>
                                    </label>
                                    <div className='hints-list'>
                                        {editingQuestion.hints.map((hint, i) => (
                                            <div
                                                key={i}
                                                className='hint-row'
                                            >
                                                <input
                                                    type='text'
                                                    value={hint}
                                                    onChange={(e) => handleHintChange(i, e.target.value)}
                                                    placeholder={`ヒント ${i + 1}`}
                                                />
                                                {editingQuestion.hints.length > 1 && (
                                                    <button
                                                        type='button'
                                                        className='btn-remove-hint'
                                                        onClick={() => handleRemoveHint(i)}
                                                    >
                                                        ✕
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className='q-actions'>
                                    {editingIndex !== null && (
                                        <button
                                            type='button'
                                            className='btn-cancel-edit'
                                            onClick={handleCancelEdit}
                                        >
                                            キャンセル
                                        </button>
                                    )}
                                    <button
                                        type='button'
                                        className='btn-add-question'
                                        onClick={handleAddOrUpdateQuestion}
                                    >
                                        {editingIndex !== null ? '✏️ 更新' : '➕ 追加'}
                                    </button>
                                </div>
                            </div>
                        :   /* --- AI Question Generation --- */
                            <div className='ai-question-form'>
                                <p className='ai-description'>難易度ごとの生成数を設定し、AIで質問を自動生成します。</p>

                                <div className='difficulty-selectors'>
                                    {(['easy', 'medium', 'hard', 'expert'] as const).map((diff) => (
                                        <div
                                            key={diff}
                                            className='difficulty-selector'
                                        >
                                            <span className='diff-label'>{DIFFICULTY_LABELS[diff]}</span>
                                            <div className='diff-counter'>
                                                <button
                                                    type='button'
                                                    onClick={() =>
                                                        setAiDifficulties((prev) => ({
                                                            ...prev,
                                                            [diff]: Math.max(0, prev[diff] - 1),
                                                        }))
                                                    }
                                                    disabled={aiDifficulties[diff] <= 0}
                                                >
                                                    −
                                                </button>
                                                <span className='diff-count'>{aiDifficulties[diff]}</span>
                                                <button
                                                    type='button'
                                                    onClick={() =>
                                                        setAiDifficulties((prev) => ({
                                                            ...prev,
                                                            [diff]: prev[diff] + 1,
                                                        }))
                                                    }
                                                >
                                                    ＋
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className='ai-summary'>
                                    AI生成: <strong>{totalAiQuestions}問</strong>
                                    {totalQuestions > 0 && (
                                        <>
                                            {' '}
                                            + 手動: <strong>{totalQuestions}問</strong>
                                        </>
                                    )}{' '}
                                    = 合計: <strong>{projectedTotal}問</strong> → HP <strong>{projectedHp}</strong>
                                </div>

                                <button
                                    type='button'
                                    className='btn-generate-ai'
                                    onClick={handleGenerateAI}
                                    disabled={isGenerating || totalAiQuestions === 0 || !name.trim()}
                                >
                                    {isGenerating ? '⏳ 生成中...' : '🤖 AIで質問を生成'}
                                </button>

                                {/* Generated Questions Preview */}
                                {generatedQuestions && (
                                    <div className='generated-preview'>
                                        <h4>生成された質問 ({generatedQuestions.length}問)</h4>
                                        <div className='generated-list'>
                                            {generatedQuestions.map((q, i) => (
                                                <div
                                                    key={i}
                                                    className='generated-item'
                                                >
                                                    <div className='gen-header'>
                                                        <span className={`diff-badge diff-${q.difficulty}`}>
                                                            {DIFFICULTY_LABELS[q.difficulty]}
                                                        </span>
                                                        <span className='gen-title'>{q.title}</span>
                                                    </div>
                                                    <div className='gen-answer'>
                                                        回答: <code>{q.expectedAnswer}</code>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className='generated-actions'>
                                            <button
                                                type='button'
                                                className='btn-discard'
                                                onClick={handleDiscardGenerated}
                                            >
                                                破棄
                                            </button>
                                            <button
                                                type='button'
                                                className='btn-accept'
                                                onClick={handleAcceptGenerated}
                                            >
                                                ✅ 質問を追加
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        }

                        {/* Added Questions List */}
                        {questions.length > 0 && (
                            <div className='questions-list'>
                                <h4>追加済みの質問 ({questions.length}問)</h4>
                                {questions.map((q, i) => (
                                    <div
                                        key={i}
                                        className={`question-item ${editingIndex === i ? 'editing' : ''}`}
                                    >
                                        <div className='q-item-header'>
                                            <span className='q-number'>#{i + 1}</span>
                                            <span className={`diff-badge diff-${q.difficulty}`}>
                                                {DIFFICULTY_LABELS[q.difficulty]}
                                            </span>
                                            <span className='q-title'>{q.title}</span>
                                        </div>
                                        <div className='q-item-answer'>
                                            回答: <code>{q.expectedAnswer}</code>
                                        </div>
                                        <div className='q-item-actions'>
                                            <button
                                                type='button'
                                                onClick={() => handleEditQuestion(i)}
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                type='button'
                                                onClick={() => handleDeleteQuestion(i)}
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className='form-actions'>
                        <button
                            type='button'
                            className='btn-cancel'
                            onClick={onClose}
                            disabled={isSaving}
                        >
                            キャンセル
                        </button>
                        <button
                            type='submit'
                            className='btn-submit'
                            disabled={isSaving || projectedTotal === 0 || !name.trim()}
                        >
                            {isSaving ? '保存中...' : `配置する (HP:${projectedHp})`}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
