import { useCallback } from 'react'

import * as PIXI from 'pixi.js'

import { Character } from '../Character'
import { ChestEntity } from '../ChestEntity'
import { type ChestData, MultiplayerManager, type PlayerData, type RankingPlayer } from '../MultiplayerManager'
import { RemotePlayer } from '../RemotePlayer'

interface UseMultiplayerOptions {
    playerName: string
    mapContainer: PIXI.Container | null
    characterRef: React.RefObject<Character | null>
    multiplayerRef: React.RefObject<MultiplayerManager | null>
    remotePlayersRef: React.RefObject<Map<string, RemotePlayer>>
    chestsRef: React.RefObject<Map<string, ChestEntity>>
    nearbyChest: string | null
    setNearbyChest: (chestId: string | null) => void
    setQuestionData: (data: { chestId: string; question: string; timeLimit: number } | null) => void
    setNotification: (message: string | null) => void
    setRanking: (ranking: RankingPlayer[]) => void
    setGradingStatus: (isGrading: boolean) => void
}

/**
 * Hook to manage multiplayer connections and callbacks
 * Encapsulates all WebSocket event handlers
 */
export const useMultiplayer = ({
    playerName,
    mapContainer,
    characterRef,
    multiplayerRef,
    remotePlayersRef,
    chestsRef,
    nearbyChest,
    setNearbyChest,
    setQuestionData,
    setNotification,
    setRanking,
    setGradingStatus,
}: UseMultiplayerOptions) => {
    const handleGameInit = useCallback(
        async (initData: { playerId: string; players: PlayerData[] }) => {
            // Find local player data from server
            const localPlayerData = initData.players.find((p) => p.id === initData.playerId)
            if (localPlayerData && !characterRef.current) {
                // Initialize character with position from server
                console.log('🎮 Creating character at server position:', localPlayerData.x, localPlayerData.y)
                const character = new Character(localPlayerData.x, localPlayerData.y, playerName)
                await character.init()
                characterRef.current = character
                if (mapContainer) mapContainer.addChild(character.getContainer())
            }
        },
        [playerName, mapContainer, characterRef]
    )

    const handlePlayerJoined = useCallback(
        async (player: PlayerData) => {
            console.log('🎮 Remote player joined:', player.id)
            const remotePlayer = new RemotePlayer(player.id, player.x, player.y, player.name)
            await remotePlayer.init()
            if (mapContainer) mapContainer.addChild(remotePlayer.getContainer())
            remotePlayersRef.current?.set(player.id, remotePlayer)
        },
        [mapContainer, remotePlayersRef]
    )

    const handlePlayerMoved = useCallback(
        (player: PlayerData) => {
            const remotePlayer = remotePlayersRef.current?.get(player.id)
            if (remotePlayer) {
                remotePlayer.updatePosition(player.x, player.y, player.direction, player.isMoving ?? true)
            }
        },
        [remotePlayersRef]
    )

    const handlePlayerLeft = useCallback(
        (playerId: string) => {
            console.log('👋 Remote player left:', playerId)
            const remotePlayer = remotePlayersRef.current?.get(playerId)
            if (remotePlayer) {
                if (mapContainer) mapContainer.removeChild(remotePlayer.getContainer())
                remotePlayer.destroy()
                remotePlayersRef.current?.delete(playerId)
            }
        },
        [mapContainer, remotePlayersRef]
    )

    const handlePlayerUpdated = useCallback(
        (player: PlayerData) => {
            // Update name for an existing remote player
            const remotePlayer = remotePlayersRef.current?.get(player.id)
            if (remotePlayer && player.name !== undefined) {
                remotePlayer.setName(player.name)
            }
            // If update refers to local player, update local label
            const localId = multiplayerRef.current?.getLocalPlayerId()
            if (localId === player.id && player.name !== undefined && characterRef.current) {
                characterRef.current.setName(player.name)
            }
        },
        [remotePlayersRef, multiplayerRef, characterRef]
    )

    const handlePlayerEmoji = useCallback(
        (data: { id: string; emoji: string; duration: number }) => {
            // Display emoji for remote or local players
            const localId = multiplayerRef.current?.getLocalPlayerId()
            if (data.id === localId) {
                // Update local character
                if (characterRef.current) characterRef.current.showEmoji(data.emoji, data.duration)
            } else {
                const remote = remotePlayersRef.current?.get(data.id)
                if (remote) remote.showEmoji(data.emoji, data.duration)
            }
        },
        [multiplayerRef, characterRef, remotePlayersRef]
    )

    const handlePlayerStatus = useCallback(
        (data: { id: string; status: 'idle' | 'busy' }) => {
            // Update status for remote or local players
            const localId = multiplayerRef.current?.getLocalPlayerId()
            if (data.id === localId) {
                // Update local character status
                if (characterRef.current) characterRef.current.setStatus(data.status)
            } else {
                const remote = remotePlayersRef.current?.get(data.id)
                if (remote) remote.setStatus(data.status)
            }
        },
        [multiplayerRef, characterRef, remotePlayersRef]
    )

    const handleInitialChests = useCallback(
        (chests: ChestData[]) => {
            // Receive initial visible chests from server on connect
            console.log('📦 Initial chests:', chests)
            for (const chest of chests) {
                if (!chestsRef.current?.has(chest.id)) {
                    const chestEntity = new ChestEntity({
                        id: chest.id,
                        x: chest.x,
                        y: chest.y,
                        rarity: chest.rarity,
                    })
                    if (mapContainer) mapContainer.addChild(chestEntity.getContainer())
                    chestsRef.current?.set(chest.id, chestEntity)
                }
            }
        },
        [mapContainer, chestsRef]
    )

    const handleChestAppear = useCallback(
        (chests: ChestData[]) => {
            // New chests appeared in visibility range
            for (const chest of chests) {
                console.log('👁️ Chest appeared:', chest.id)
                if (!chestsRef.current?.has(chest.id)) {
                    const chestEntity = new ChestEntity({
                        id: chest.id,
                        x: chest.x,
                        y: chest.y,
                        rarity: chest.rarity,
                    })
                    if (mapContainer) mapContainer.addChild(chestEntity.getContainer())
                    chestsRef.current?.set(chest.id, chestEntity)
                }
            }
        },
        [mapContainer, chestsRef]
    )

    const handleChestDisappear = useCallback(
        (chestIds: string[]) => {
            // Chests disappeared - remove from map
            for (const chestId of chestIds) {
                console.log('👋 Chest disappeared:', chestId)

                const chestEntity = chestsRef.current?.get(chestId)
                if (chestEntity) {
                    // Remove chest from map (animation already played via chest:opened)
                    if (mapContainer) mapContainer.removeChild(chestEntity.getContainer())
                    chestEntity.destroy()
                    chestsRef.current?.delete(chestId)

                    // Clear nearby hint if this was the nearby chest
                    if (nearbyChest === chestId) {
                        setNearbyChest(null)
                    }
                }
            }
        },
        [mapContainer, chestsRef, nearbyChest, setNearbyChest]
    )

    const handleChestQuestion = useCallback(
        (data: { chestId: string; question: string; timeLimit: number }) => {
            // Show question popup
            setQuestionData({
                chestId: data.chestId,
                question: data.question,
                timeLimit: data.timeLimit,
            })
        },
        [setQuestionData]
    )

    const handleChestTimeout = useCallback(
        (data: { message?: string }) => {
            // Close popup and show timeout notification
            setQuestionData(null)
            setNotification(data.message || 'タイムアウトしました')
            setTimeout(() => setNotification(null), 2000)
        },
        [setQuestionData, setNotification]
    )

    const handleChestOpened = useCallback(
        async (data: { chestId: string }) => {
            // Chest was opened by someone - play animation for all players
            const chestEntity = chestsRef.current?.get(data.chestId)
            if (chestEntity) {
                console.log('🎉 Playing open animation for chest:', data.chestId)
                await chestEntity.playOpenAnimation()
                // Chest will be removed by entity:disappear event after animation
            }
        },
        [chestsRef]
    )

    const handleChestGrading = useCallback(
        (data: { chestId: string }) => {
            console.log('🤖 AI is grading answer for chest:', data.chestId)
            setGradingStatus(true)
        },
        [setGradingStatus]
    )

    const handleChestAnswerResult = useCallback(
        async (result: { success: boolean; cooldown?: number; message?: string; reason?: string }) => {
            // Stop grading status
            setGradingStatus(false)

            // Close question popup
            setQuestionData(null)

            if (result.success) {
                // Correct answer - show success notification
                setNotification('正解！ +1ポイント')
                setTimeout(() => setNotification(null), 2000)
                // Animation will be handled by chest:opened event
            } else {
                // Wrong answer or other error
                if (result.cooldown) {
                    setNotification(`不正解！ 5秒待ってください`)
                    setTimeout(() => setNotification(null), 3000)
                } else if (result.message) {
                    setNotification(result.message)
                    setTimeout(() => setNotification(null), 2000)
                } else if (result.reason) {
                    setNotification(result.reason)
                    setTimeout(() => setNotification(null), 2000)
                }
            }
        },
        [setQuestionData, setNotification, setGradingStatus]
    )

    const handleChestInteractResult = useCallback(
        (result: { success: boolean; reason?: string }) => {
            // Handle errors from interact request (not from answer)
            if (!result.success && result.reason) {
                setNotification(result.reason)
                setTimeout(() => setNotification(null), 2000)
            }
        },
        [setNotification]
    )

    const handleRankingUpdate = useCallback(
        (rankingData: RankingPlayer[]) => {
            setRanking(rankingData)
        },
        [setRanking]
    )

    // Initialize multiplayer manager with all callbacks
    const initializeMultiplayer = useCallback(() => {
        if (!mapContainer || multiplayerRef.current) return null

        const multiplayer = new MultiplayerManager({
            onGameInit: handleGameInit,
            onPlayerJoined: handlePlayerJoined,
            onPlayerMoved: handlePlayerMoved,
            onPlayerLeft: handlePlayerLeft,
            onPlayerUpdated: handlePlayerUpdated,
            onPlayerEmoji: handlePlayerEmoji,
            onPlayerStatus: handlePlayerStatus,
            onInitialChests: handleInitialChests,
            onChestAppear: handleChestAppear,
            onChestDisappear: handleChestDisappear,
            onChestQuestion: handleChestQuestion,
            onChestGrading: handleChestGrading,
            onChestTimeout: handleChestTimeout,
            onChestOpened: handleChestOpened,
            onChestAnswerResult: handleChestAnswerResult,
            onChestInteractResult: handleChestInteractResult,
            onRankingUpdate: handleRankingUpdate,
        })

        multiplayer.connect(playerName)
        multiplayerRef.current = multiplayer

        return multiplayer
    }, [
        playerName,
        mapContainer,
        multiplayerRef,
        handleGameInit,
        handlePlayerJoined,
        handlePlayerMoved,
        handlePlayerLeft,
        handlePlayerUpdated,
        handlePlayerEmoji,
        handlePlayerStatus,
        handleInitialChests,
        handleChestAppear,
        handleChestDisappear,
        handleChestQuestion,
        handleChestTimeout,
        handleChestOpened,
        handleChestAnswerResult,
        handleChestInteractResult,
        handleRankingUpdate,
    ])

    return { initializeMultiplayer }
}
