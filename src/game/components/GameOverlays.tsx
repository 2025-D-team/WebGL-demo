import * as PIXI from 'pixi.js'

import { type RankingPlayer } from '../MultiplayerManager'
import { QuestionPopup } from '../QuestionPopup'
import { Ranking } from '../Ranking'

interface GameOverlaysProps {
    nearbyChest: string | null
    nearbyChestPos: { x: number; y: number } | null
    mapContainer: PIXI.Container | null
    ranking: RankingPlayer[]
    localPlayerId: string | null
    questionData: {
        chestId: string
        question: string
        timeLimit: number
    } | null
    onSubmitAnswer: (answer: string) => void
    onCancelQuestion: () => void
}

/**
 * Component for game overlays (chest hints, ranking, question popup)
 */
export const GameOverlays = ({
    nearbyChest,
    nearbyChestPos,
    mapContainer,
    ranking,
    localPlayerId,
    questionData,
    onSubmitAnswer,
    onCancelQuestion,
}: GameOverlaysProps) => {
    return (
        <>
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
                    onSubmit={onSubmitAnswer}
                    onCancel={onCancelQuestion}
                />
            )}
        </>
    )
}
