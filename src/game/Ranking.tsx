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
    const truncateName = (name: string, maxLength = 12) => {
        if (name.length <= maxLength) return name
        return name.substring(0, maxLength) + '...'
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
                <span>🏆 World Ranking</span>
                <span style={{ fontSize: 18 }}>{isExpanded ? '▼' : '▶'}</span>
            </div>

            {/* Player List */}
            {isExpanded && (
                <div
                    style={{
                        maxHeight: 400, // ~10 players * 40px
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
                            No players online
                        </div>
                    :   players.map((player, index) => (
                            <div
                                key={player.id}
                                style={{
                                    padding: '10px 16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 12,
                                    borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
                                    background:
                                        player.id === localPlayerId ? 'rgba(102, 126, 234, 0.1)' : 'transparent',
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
                                        color: index < 3 ? '#ffd700' : '#666',
                                    }}
                                >
                                    {index + 1}
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
                        ))
                    }
                </div>
            )}
        </div>
    )
}
