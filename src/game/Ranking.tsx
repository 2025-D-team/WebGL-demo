import { useState } from 'react'

interface RankingPlayer {
    id: string
    name: string
    score: number
}

interface RankingProps {
    players: RankingPlayer[]
    localPlayerId: string | null
}

export const Ranking = ({ players, localPlayerId }: RankingProps) => {
    const [isExpanded, setIsExpanded] = useState(true)

    // Truncate long names
    const truncateName = (name: string, maxLength = 8) => {
        if (name.length <= maxLength) return name
        return name.substring(0, maxLength) + '...'
    }

    // Sort players by score (descending), if same score then by order in array (first come, first served)
    const sortedPlayers = [...players].sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score
        return players.indexOf(a) - players.indexOf(b)
    })

    // Get top 8 players
    const top8 = sortedPlayers.slice(0, 8)

    // Find local player's rank and data
    const localPlayerIndex = sortedPlayers.findIndex((p) => p.id === localPlayerId)
    const localPlayerRank = localPlayerIndex + 1
    const isLocalPlayerInTop8 = localPlayerIndex < 8 && localPlayerIndex >= 0
    const localPlayerData = localPlayerIndex >= 0 ? sortedPlayers[localPlayerIndex] : null

    // Determine what to display
    let displayPlayers = top8
    let showSeparator = false

    if (localPlayerData && !isLocalPlayerInTop8) {
        // Local player is outside top 8, show them at the bottom with separator
        displayPlayers = [...top8, localPlayerData]
        showSeparator = true
    }

    return (
        <div
            style={{
                position: 'absolute',
                top: 20,
                right: 20,
                zIndex: 9998,
                background: 'rgba(255, 255, 255, 0.95)',
                borderRadius: 12,
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                overflow: 'hidden',
                minWidth: 240,
                border: '1px solid rgba(0, 0, 0, 0.1)',
            }}
        >
            {/* Header */}
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                style={{
                    padding: '12px 16px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: 14,
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    userSelect: 'none',
                }}
            >
                <span>🏆 世界ランキング</span>
                <span style={{ fontSize: 18 }}>{isExpanded ? '▼' : '▶'}</span>
            </div>

            {/* Player List */}
            {isExpanded && (
                <div
                    style={{
                        maxHeight: 500,
                        overflowY: 'auto',
                        overflowX: 'hidden',
                    }}
                >
                    {players.length === 0 ?
                        <div
                            style={{
                                padding: '20px',
                                textAlign: 'center',
                                color: '#999',
                                fontSize: 13,
                            }}
                        >
                            オンラインプレイヤーなし
                        </div>
                    :   <>
                            {displayPlayers.map((player, displayIndex) => {
                                // Calculate actual rank
                                const actualRank =
                                    player.id === localPlayerId && !isLocalPlayerInTop8 ?
                                        localPlayerRank
                                    :   displayIndex + 1

                                // Check if we need to show separator before this player
                                const needsSeparator = showSeparator && displayIndex === 8

                                return (
                                    <div key={player.id}>
                                        {/* Separator for out-of-top-10 player */}
                                        {needsSeparator && (
                                            <div
                                                style={{
                                                    padding: '8px 16px',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: 4,
                                                }}
                                            >
                                                <hr
                                                    style={{
                                                        border: 'none',
                                                        borderTop: '1px dashed rgba(0, 0, 0, 0.2)',
                                                        margin: 0,
                                                        width: '100%',
                                                    }}
                                                />
                                                <hr
                                                    style={{
                                                        border: 'none',
                                                        borderTop: '1px dashed rgba(0, 0, 0, 0.2)',
                                                        margin: 0,
                                                        width: '100%',
                                                    }}
                                                />
                                            </div>
                                        )}

                                        <div
                                            style={{
                                                padding: '10px 16px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 12,
                                                borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
                                                background:
                                                    player.id === localPlayerId ?
                                                        'rgba(102, 126, 234, 0.1)'
                                                    :   'transparent',
                                                transition: 'background 0.2s',
                                            }}
                                        >
                                            {/* Rank Number */}
                                            <div
                                                style={{
                                                    width: 24,
                                                    height: 24,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: 12,
                                                    fontWeight: 'bold',
                                                    color: actualRank <= 3 ? '#ffd700' : '#666',
                                                }}
                                            >
                                                {actualRank}
                                            </div>

                                            {/* Avatar */}
                                            <div
                                                style={{
                                                    width: 32,
                                                    height: 32,
                                                    borderRadius: '50%',
                                                    background: '#fff',
                                                    border: '2px solid #ddd',
                                                    position: 'relative',
                                                }}
                                            >
                                                {/* Online Dot */}
                                                <div
                                                    style={{
                                                        position: 'absolute',
                                                        bottom: 0,
                                                        right: 0,
                                                        width: 10,
                                                        height: 10,
                                                        borderRadius: '50%',
                                                        background: '#00ff00',
                                                        border: '2px solid white',
                                                    }}
                                                />
                                            </div>

                                            {/* Name */}
                                            <div
                                                style={{
                                                    flex: 1,
                                                    fontSize: 13,
                                                    fontWeight: player.id === localPlayerId ? 'bold' : '500',
                                                    color: '#333',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap',
                                                }}
                                            >
                                                {truncateName(player.name)}
                                            </div>

                                            {/* Score */}
                                            <div
                                                style={{
                                                    fontSize: 14,
                                                    fontWeight: 'bold',
                                                    color: '#667eea',
                                                }}
                                            >
                                                {player.score}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}

                            {/* Show online count if local player is in top 8 */}
                            {isLocalPlayerInTop8 && players.length > 8 && (
                                <div>
                                    <div
                                        style={{
                                            padding: '8px 16px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: 4,
                                        }}
                                    >
                                        <hr
                                            style={{
                                                border: 'none',
                                                borderTop: '1px dashed rgba(0, 0, 0, 0.2)',
                                                margin: 0,
                                                width: '100%',
                                            }}
                                        />
                                        <hr
                                            style={{
                                                border: 'none',
                                                borderTop: '1px dashed rgba(0, 0, 0, 0.2)',
                                                margin: 0,
                                                width: '100%',
                                            }}
                                        />
                                    </div>
                                    <div
                                        style={{
                                            padding: '10px 16px',
                                            textAlign: 'center',
                                            fontSize: 12,
                                            color: '#999',
                                            fontStyle: 'italic',
                                        }}
                                    >
                                        合計 {players.length} 人がオンライン
                                    </div>
                                </div>
                            )}
                        </>
                    }
                </div>
            )}
        </div>
    )
}
