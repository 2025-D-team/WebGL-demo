import * as PIXI from 'pixi.js'

import { type RankingPlayer } from '../MultiplayerManager'
import { QuestionPopup } from '../QuestionPopup'
import { Ranking } from '../Ranking'

interface GameOverlaysProps {
    nearbyChest: string | null
    nearbyChestPos: { x: number; y: number } | null
    nearbyBoss: number | null
    nearbyBossPos: { x: number; y: number } | null
    mapContainer: PIXI.Container | null
    ranking: RankingPlayer[]
    localPlayerId: string | null
    questionData: {
        chestId?: string
        bossSpawnId?: number
        questionId?: number
        question: string
        timeLimit: number
    } | null
    isGrading: boolean
    bossSpawnCountdown: { bossName: string; remainingSeconds: number } | null
    onSubmitAnswer: (answer: string) => void
    onCancelQuestion: () => void
}

/**
 * Component for game overlays (chest hints, ranking, question popup)
 */
export const GameOverlays = ({
    nearbyChest,
    nearbyChestPos,
    nearbyBoss,
    nearbyBossPos,
    mapContainer,
    ranking,
    localPlayerId,
    questionData,
    isGrading,
    bossSpawnCountdown,
    onSubmitAnswer,
    onCancelQuestion,
}: GameOverlaysProps) => {
    const formatRemaining = (seconds: number) => {
        const mm = Math.floor(seconds / 60)
        const ss = seconds % 60
        return `${String(mm).padStart(2, '0')}分 ${String(ss).padStart(2, '0')}秒`
    }

    return (
        <>
            {/* Boss spawn countdown event banner (< 5 minutes) */}
            {bossSpawnCountdown && (
                <div
                    style={{
                        position: 'absolute',
                        top: 16,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'rgba(20, 0, 0, 0.78)',
                        color: '#ef4444',
                        border: '1px solid rgba(239,68,68,0.6)',
                        borderRadius: 10,
                        padding: '10px 18px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                        zIndex: 10005,
                        fontSize: 20,
                        fontWeight: 800,
                        letterSpacing: 0.2,
                        pointerEvents: 'none',
                        whiteSpace: 'nowrap',
                    }}
                >
                    {`イベント: ${bossSpawnCountdown.bossName} の出現まで ${formatRemaining(bossSpawnCountdown.remainingSeconds)}`}
                </div>
            )}

            {/* Chest interaction hint */}
            {nearbyChest &&
                nearbyChestPos &&
                mapContainer &&
                (() => {
                    const chestScreenX = nearbyChestPos.x + mapContainer.x
                    const chestScreenY = nearbyChestPos.y + mapContainer.y
                    return (
                        <div
                            style={{
                                position: 'absolute',
                                top: chestScreenY - 30,
                                left: chestScreenX + 35,
                                background: 'rgba(0, 0, 0, 0.8)',
                                color: 'white',
                                padding: '6px 12px',
                                borderRadius: 6,
                                fontSize: 13,
                                fontWeight: '600',
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                                zIndex: 9999,
                                pointerEvents: 'none',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            Fキーを押して <span style={{ color: '#ffd700' }}>開く</span>
                        </div>
                    )
                })()}

            {/* Boss interaction hint */}
            {nearbyBoss &&
                nearbyBossPos &&
                mapContainer &&
                !nearbyChest &&
                (() => {
                    const bossScreenX = nearbyBossPos.x + mapContainer.x
                    const bossScreenY = nearbyBossPos.y + mapContainer.y
                    return (
                        <div
                            style={{
                                position: 'absolute',
                                top: bossScreenY - 220,
                                left: bossScreenX,
                                transform: 'translateX(-50%)',
                                background: 'rgba(139, 0, 0, 0.9)',
                                color: 'white',
                                padding: '8px 16px',
                                borderRadius: 8,
                                fontSize: 14,
                                fontWeight: '700',
                                boxShadow: '0 2px 12px rgba(229, 62, 62, 0.5)',
                                border: '1px solid rgba(255, 100, 100, 0.4)',
                                zIndex: 9999,
                                pointerEvents: 'none',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            Fキーで <span style={{ color: '#ff6666' }}>ボスに挑戦</span> 🗡️
                        </div>
                    )
                })()}

            {/* World Ranking */}
            <Ranking
                players={ranking}
                localPlayerId={localPlayerId}
            />

            {/* Question Popup */}
            {questionData && (
                <QuestionPopup
                    question={questionData.question}
                    timeLimit={questionData.timeLimit}
                    isGrading={isGrading}
                    onSubmit={onSubmitAnswer}
                    onCancel={onCancelQuestion}
                />
            )}
        </>
    )
}
