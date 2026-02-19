import { useEffect, useMemo, useState } from 'react'

import { gameAPI } from '../services/api'

interface RankingPlayer {
    id: string
    name: string
    score: number
    isBot?: boolean
}

interface RankingProps {
    players: RankingPlayer[]
    localPlayerId: string | null
}

type RankingTab = 'online' | 'alltime'

export const Ranking = ({ players, localPlayerId }: RankingProps) => {
    const [isExpanded, setIsExpanded] = useState(false)
    const [activeTab, setActiveTab] = useState<RankingTab>('online')
    const [allTimePlayers, setAllTimePlayers] = useState<RankingPlayer[]>([])

    const sortedOnlinePlayers = useMemo(() => {
        return [...players].sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score
            return players.indexOf(a) - players.indexOf(b)
        })
    }, [players])

    const allTimeSorted = useMemo(() => [...allTimePlayers].sort((a, b) => b.score - a.score), [allTimePlayers])

    const onlineDisplayState = useMemo(() => {
        const top8 = sortedOnlinePlayers.slice(0, 8)
        const localPlayerIndex = sortedOnlinePlayers.findIndex((p) => p.id === localPlayerId)
        const localPlayerRank = localPlayerIndex + 1
        const isLocalPlayerInTop8 = localPlayerIndex >= 0 && localPlayerIndex < 8
        const localPlayerData = localPlayerIndex >= 0 ? sortedOnlinePlayers[localPlayerIndex] : null

        let displayPlayers = top8
        let showSeparator = false
        if (localPlayerData && !isLocalPlayerInTop8) {
            displayPlayers = [...top8, localPlayerData]
            showSeparator = true
        }

        return {
            displayPlayers,
            showSeparator,
            isLocalPlayerInTop8,
            localPlayerRank,
            totalOnline: sortedOnlinePlayers.length,
        }
    }, [localPlayerId, sortedOnlinePlayers])

    useEffect(() => {
        let mounted = true
        const fetchAllTime = async () => {
            try {
                const result = await gameAPI.getLeaderboardAllTime()
                if (!mounted) return
                if (result.success && Array.isArray(result.ranking)) {
                    setAllTimePlayers(result.ranking as RankingPlayer[])
                }
            } catch {
                // Keep current list on transient errors.
            }
        }

        fetchAllTime()
        return () => {
            mounted = false
        }
    }, [])

    useEffect(() => {
        const timer = setTimeout(async () => {
            try {
                const result = await gameAPI.getLeaderboardAllTime()
                if (result.success && Array.isArray(result.ranking)) {
                    setAllTimePlayers(result.ranking as RankingPlayer[])
                }
            } catch {
                // Ignore refresh failures.
            }
        }, 300)
        return () => clearTimeout(timer)
    }, [players])

    return (
        <div
            style={{
                position: 'absolute',
                top: 20,
                right: 20,
                zIndex: 9998,
                width: 330,
                borderRadius: 12,
                overflow: 'hidden',
                border: '1px solid rgba(252, 211, 77, 0.45)',
                boxShadow: '0 12px 28px rgba(0,0,0,0.45)',
                background: 'linear-gradient(180deg, rgba(15,23,42,0.97) 0%, rgba(2,6,23,0.98) 100%)',
                color: '#e2e8f0',
            }}
        >
            <button
                onClick={() => setIsExpanded((v) => !v)}
                style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: 'none',
                    background: 'linear-gradient(180deg, rgba(250,204,21,0.24) 0%, rgba(15,23,42,0) 100%)',
                    color: '#fef3c7',
                    fontWeight: 800,
                    fontSize: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    letterSpacing: 0.5,
                    cursor: 'pointer',
                }}
            >
                <span>世界ランキング</span>
                <span style={{ color: '#fcd34d', fontSize: 16 }}>{isExpanded ? '▾' : '▸'}</span>
            </button>

            {isExpanded && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', padding: 8, gap: 8 }}>
                        <button
                            onClick={() => setActiveTab('online')}
                            style={{
                                height: 34,
                                borderRadius: 8,
                                border: '1px solid rgba(148,163,184,0.35)',
                                background:
                                    activeTab === 'online' ?
                                        'linear-gradient(180deg, rgba(56,189,248,0.35), rgba(30,41,59,0.9))'
                                    :   'rgba(255,255,255,0.04)',
                                color: activeTab === 'online' ? '#e0f2fe' : '#cbd5e1',
                                fontWeight: 700,
                                cursor: 'pointer',
                            }}
                        >
                            オンライン
                        </button>
                        <button
                            onClick={() => setActiveTab('alltime')}
                            style={{
                                height: 34,
                                borderRadius: 8,
                                border: '1px solid rgba(148,163,184,0.35)',
                                background:
                                    activeTab === 'alltime' ?
                                        'linear-gradient(180deg, rgba(250,204,21,0.28), rgba(30,41,59,0.9))'
                                    :   'rgba(255,255,255,0.04)',
                                color: activeTab === 'alltime' ? '#fef3c7' : '#cbd5e1',
                                fontWeight: 700,
                                cursor: 'pointer',
                            }}
                        >
                            全期間
                        </button>
                    </div>

                    {activeTab === 'online' ?
                        <div style={{ maxHeight: 390, overflowY: 'auto', padding: '0 8px 8px 8px' }}>
                            {onlineDisplayState.totalOnline === 0 ?
                                <div style={{ padding: 16, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
                                    オンラインプレイヤーなし
                                </div>
                            :   <>
                                    {onlineDisplayState.displayPlayers.map((player, displayIndex) => {
                                        const actualRank =
                                            player.id === localPlayerId && !onlineDisplayState.isLocalPlayerInTop8 ?
                                                onlineDisplayState.localPlayerRank
                                            :   displayIndex + 1
                                        const needsSeparator = onlineDisplayState.showSeparator && displayIndex === 8
                                        return (
                                            <div key={`${player.id}-${displayIndex}`}>
                                                {needsSeparator && (
                                                    <div
                                                        style={{
                                                            margin: '6px 4px',
                                                            borderTop: '1px dashed rgba(148,163,184,0.45)',
                                                        }}
                                                    />
                                                )}
                                                <div
                                                    style={{
                                                        height: 36,
                                                        borderRadius: 8,
                                                        display: 'grid',
                                                        gridTemplateColumns: '34px 1fr auto',
                                                        alignItems: 'center',
                                                        gap: 8,
                                                        padding: '0 10px',
                                                        marginBottom: 6,
                                                        background:
                                                            player.id === localPlayerId ?
                                                                'rgba(56,189,248,0.18)'
                                                            :   'rgba(15,23,42,0.45)',
                                                        border:
                                                            player.id === localPlayerId ?
                                                                '1px solid rgba(56,189,248,0.55)'
                                                            :   '1px solid rgba(148,163,184,0.25)',
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            fontWeight: 800,
                                                            color: actualRank <= 3 ? '#fcd34d' : '#cbd5e1',
                                                        }}
                                                    >
                                                        {actualRank}.
                                                    </span>
                                                    <span
                                                        style={{
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        {player.name}
                                                    </span>
                                                    <span style={{ color: '#7dd3fc', fontWeight: 800 }}>
                                                        {player.score}
                                                    </span>
                                                </div>
                                            </div>
                                        )
                                    })}

                                    {onlineDisplayState.isLocalPlayerInTop8 && onlineDisplayState.totalOnline > 8 && (
                                        <div
                                            style={{
                                                marginTop: 2,
                                                padding: '8px 10px',
                                                fontSize: 12,
                                                color: '#94a3b8',
                                                borderTop: '1px dashed rgba(148,163,184,0.45)',
                                                textAlign: 'center',
                                            }}
                                        >
                                            合計 {onlineDisplayState.totalOnline} 人がオンライン
                                        </div>
                                    )}
                                </>
                            }
                        </div>
                    :   <div style={{ maxHeight: 390, overflowY: 'auto', padding: '0 8px 8px 8px' }}>
                            {allTimeSorted.length === 0 ?
                                <div style={{ padding: 16, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
                                    データがありません
                                </div>
                            :   allTimeSorted.map((player, index) => (
                                    <div
                                        key={`${player.id}-${index}`}
                                        style={{
                                            height: 36,
                                            borderRadius: 8,
                                            display: 'grid',
                                            gridTemplateColumns: '34px 1fr auto',
                                            alignItems: 'center',
                                            gap: 8,
                                            padding: '0 10px',
                                            marginBottom: 6,
                                            background: player.isBot ? 'rgba(30,41,59,0.68)' : 'rgba(15,23,42,0.45)',
                                            border: '1px solid rgba(148,163,184,0.25)',
                                        }}
                                    >
                                        <span style={{ fontWeight: 800, color: index < 3 ? '#fcd34d' : '#cbd5e1' }}>
                                            {index + 1}.
                                        </span>
                                        <span
                                            style={{
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                                fontWeight: 600,
                                                color: player.isBot ? '#fef3c7' : '#e2e8f0',
                                            }}
                                        >
                                            {player.name}
                                        </span>
                                        <span style={{ color: '#fcd34d', fontWeight: 800 }}>{player.score}</span>
                                    </div>
                                ))
                            }
                        </div>
                    }
                </div>
            )}
        </div>
    )
}
