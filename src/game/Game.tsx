import { useEffect, useRef, useState } from 'react'

import { GameConfig } from '../config/gameConfig'
import { CollisionManager } from './CollisionManager'
import { type WorldMessageData } from './MultiplayerManager'
import { TiledMapLoader } from './TiledMapLoader'
import { GameOverlays } from './components/GameOverlays'
import { GameUI } from './components/GameUI'
import { EQUIPMENT_BY_ID } from './equipment/EquipmentConfig'
import { type CatalogEquipmentItem, type PlayerEquipment } from './equipment/types'
import { useGameEngine } from './hooks/useGameEngine'
import { useGameLoop } from './hooks/useGameLoop'
import { useGameState } from './hooks/useGameState'

const mapServerCatalogToFrontend = (items: unknown[]): CatalogEquipmentItem[] => {
    const allowedSlots = new Set(['head', 'armor', 'foot'])
    return items
        .map((raw) => {
            const item = raw as {
                id?: string
                name?: string
                slot?: string
                setId?: string
                price?: number
                enabled?: boolean
            }
            if (!item?.id || !item.slot || !allowedSlots.has(item.slot)) return null

            const local = EQUIPMENT_BY_ID.get(item.id)
            if (!local) return null

            return {
                ...local,
                name: item.name || local.name,
                setId: item.setId || local.setId,
                price: typeof item.price === 'number' ? item.price : local.price,
                enabled: typeof item.enabled === 'boolean' ? item.enabled : local.enabled,
            } satisfies CatalogEquipmentItem
        })
        .filter((item): item is CatalogEquipmentItem => item !== null)
}

export const Game = ({ playerName = '' }: { playerName?: string }) => {
    const canvasRef = useRef<HTMLDivElement | null>(null)
    const [currentUsername, setCurrentUsername] = useState(playerName)
    const [currentEmail, setCurrentEmail] = useState('')

    // Initialize PIXI engine
    const { appRef, isInitialized } = useGameEngine({ canvasRef })

    // Initialize game state
    const {
        mapContainerRef,
        characterRef,
        inputHandlerRef,
        remotePlayersRef,
        chestsRef,
        bossesRef,
        multiplayerRef,
        nearbyChestRef,
        nearbyBossRef,
        nearbyChest,
        setNearbyChest,
        nearbyChestPos,
        setNearbyChestPos,
        nearbyBoss,
        setNearbyBoss,
        nearbyBossPos,
        setNearbyBossPos,
        showEmojiPicker,
        setShowEmojiPicker,
        notification,
        setNotification,
        ranking,
        setRanking,
        questionData,
        setQuestionData,
        isGrading,
        setIsGrading,
        showInventory,
        setShowInventory,
        showShop,
        setShowShop,
        itemCatalog,
        setItemCatalog,
        inventory,
        setInventory,
        equippedItems,
        setEquippedItems,
        playerScore,
        setPlayerScore,
        worldMessages,
        setWorldMessages,
        bossSpawnCountdown,
        setBossSpawnCountdown,
        characterReady,
        setCharacterReady,
    } = useGameState()

    // Map dimensions (set after map loads)
    const mapDimensionsRef = useRef({ width: 3072, height: 3072 })
    const collisionManagerRef = useRef<CollisionManager>(new CollisionManager())

    // Load map and initialize game systems
    useEffect(() => {
        if (!isInitialized || !appRef.current || !canvasRef.current) return

        let isMounted = true
        const app = appRef.current
        let localMultiplayer: { disconnect: () => void } | null = null
        const remotePlayers = remotePlayersRef.current

        const initGame = async () => {
            try {
                // Load and render map
                const mapLoader = new TiledMapLoader()
                const mapContainer = await mapLoader.loadMap('/maps/map.tmj')
                mapContainerRef.current = mapContainer
                app.stage.addChild(mapContainer)

                // Get map dimensions
                const mapData = mapLoader.getMapData()
                if (mapData) {
                    const mapWidth = mapData.width * mapData.tilewidth
                    const mapHeight = mapData.height * mapData.tileheight
                    mapDimensionsRef.current = { width: mapWidth, height: mapHeight }
                    console.log(`Map size: ${mapWidth}x${mapHeight} pixels`)
                    console.log(`Grid: ${mapData.width}x${mapData.height} tiles`)

                    // Set 1:1 scale (100% zoom, no scaling)
                    mapContainer.scale.set(1)
                }

                // Load collision objects from map
                const collisionObjects = mapLoader.getCollisionObjects()
                collisionManagerRef.current.loadFromTiledObjects(collisionObjects)

                // Load boss spawns from server and render on map
                try {
                    const { gameAPI } = await import('../services/api')
                    const { BossEntity } = await import('./BossEntity')
                    const bossResult = await gameAPI.getBossSpawns()
                    if (bossResult.success && bossResult.bosses) {
                        console.log(`👹 Loading ${bossResult.bosses.length} boss spawns`)
                        for (const bossData of bossResult.bosses) {
                            const bossEntity = new BossEntity(bossData)
                            mapContainer.addChild(bossEntity.getContainer())
                            bossesRef.current.set(bossData.id, bossEntity)
                        }
                    }
                } catch (e) {
                    console.warn('Failed to load boss spawns:', e)
                }

                // Initialize input handler
                const { InputHandler } = await import('./InputHandler')
                const inputHandler = new InputHandler()
                inputHandlerRef.current = inputHandler

                // Register F key interaction handler
                inputHandler.onInteract(() => {
                    // Chest interaction takes priority
                    if (nearbyChestRef.current && multiplayerRef.current) {
                        console.log('🎯 Interacting with chest:', nearbyChestRef.current)
                        multiplayerRef.current.interactWithChest(nearbyChestRef.current)
                    } else if (nearbyBossRef.current && multiplayerRef.current) {
                        console.log('👹 Interacting with boss:', nearbyBossRef.current)
                        multiplayerRef.current.interactWithBoss(nearbyBossRef.current)
                    }
                })

                // Initialize multiplayer AFTER map is loaded
                if (GameConfig.multiplayer.enabled && !multiplayerRef.current) {
                    const { MultiplayerManager } = await import('./MultiplayerManager')
                    const CharacterModule = await import('./Character')
                    const RemotePlayerModule = await import('./RemotePlayer')
                    const ChestEntityModule = await import('./ChestEntity')

                    const multiplayer = new MultiplayerManager({
                        onGameInit: async (initData) => {
                            const localPlayerData = initData.players.find((p) => p.id === initData.playerId)
                            if (localPlayerData && !characterRef.current) {
                                console.log(
                                    '🎮 Creating character at server position:',
                                    localPlayerData.x,
                                    localPlayerData.y
                                )
                                const character = new CharacterModule.Character(
                                    localPlayerData.x,
                                    localPlayerData.y,
                                    playerName,
                                    localPlayerData.equipment
                                )
                                await character.init()
                                characterRef.current = character
                                setEquippedItems(localPlayerData.equipment || null)
                                mapContainer.addChild(character.getContainer())

                                // Center camera on character immediately
                                mapContainer.x = window.innerWidth / 2 - localPlayerData.x
                                mapContainer.y = window.innerHeight / 2 - localPlayerData.y

                                setCharacterReady(true)
                            }
                        },
                        onPlayerJoined: async (player) => {
                            console.log('🎮 Remote player joined:', player.id)
                            const remotePlayer = new RemotePlayerModule.RemotePlayer(
                                player.id,
                                player.x,
                                player.y,
                                player.name,
                                player.equipment
                            )
                            await remotePlayer.init()
                            mapContainer.addChild(remotePlayer.getContainer())
                            remotePlayersRef.current.set(player.id, remotePlayer)
                        },
                        onPlayerMoved: (player) => {
                            const remotePlayer = remotePlayersRef.current.get(player.id)
                            if (remotePlayer) {
                                remotePlayer.updatePosition(
                                    player.x,
                                    player.y,
                                    player.direction,
                                    player.isMoving ?? true
                                )
                            }
                        },
                        onPlayerLeft: (playerId) => {
                            console.log('👋 Remote player left:', playerId)
                            const remotePlayer = remotePlayersRef.current.get(playerId)
                            if (remotePlayer) {
                                mapContainer.removeChild(remotePlayer.getContainer())
                                remotePlayer.destroy()
                                remotePlayersRef.current.delete(playerId)
                            }
                        },
                        onPlayerUpdated: (player) => {
                            const remotePlayer = remotePlayersRef.current.get(player.id)
                            if (remotePlayer && player.name !== undefined) {
                                remotePlayer.setName(player.name)
                            }
                            const localId = multiplayerRef.current?.getLocalPlayerId()
                            if (localId === player.id && player.name !== undefined && characterRef.current) {
                                characterRef.current.setName(player.name)
                            }
                        },
                        onPlayerEmoji: (data) => {
                            const localId = multiplayerRef.current?.getLocalPlayerId()
                            if (data.id === localId) {
                                if (characterRef.current) characterRef.current.showEmoji(data.emoji, data.duration)
                            } else {
                                const remote = remotePlayersRef.current.get(data.id)
                                if (remote) remote.showEmoji(data.emoji, data.duration)
                            }
                        },
                        onPlayerStatus: (data) => {
                            const localId = multiplayerRef.current?.getLocalPlayerId()
                            if (data.id === localId) {
                                if (characterRef.current) characterRef.current.setStatus(data.status)
                            } else {
                                const remote = remotePlayersRef.current.get(data.id)
                                if (remote) remote.setStatus(data.status)
                            }
                        },
                        onPlayerEquipment: async (data) => {
                            const localId = multiplayerRef.current?.getLocalPlayerId()
                            if (data.playerId === localId) {
                                setEquippedItems(data.equipment)
                                await characterRef.current?.setEquipment(data.equipment)
                                return
                            }

                            const remote = remotePlayersRef.current.get(data.playerId)
                            if (remote) {
                                await remote.setEquipment(data.equipment)
                            }
                        },
                        onInitialChests: (chests) => {
                            console.log('📦 Initial chests:', chests)
                            for (const chest of chests) {
                                if (!chestsRef.current.has(chest.id)) {
                                    const chestEntity = new ChestEntityModule.ChestEntity({
                                        id: chest.id,
                                        x: chest.x,
                                        y: chest.y,
                                        rarity: chest.rarity,
                                    })
                                    mapContainer.addChild(chestEntity.getContainer())
                                    chestsRef.current.set(chest.id, chestEntity)
                                }
                            }
                        },
                        onChestAppear: (chests) => {
                            for (const chest of chests) {
                                console.log('👁️ Chest appeared:', chest.id)
                                if (!chestsRef.current.has(chest.id)) {
                                    const chestEntity = new ChestEntityModule.ChestEntity({
                                        id: chest.id,
                                        x: chest.x,
                                        y: chest.y,
                                        rarity: chest.rarity,
                                    })
                                    mapContainer.addChild(chestEntity.getContainer())
                                    chestsRef.current.set(chest.id, chestEntity)
                                }
                            }
                        },
                        onChestDisappear: (chestIds) => {
                            for (const chestId of chestIds) {
                                console.log('👋 Chest disappeared:', chestId)
                                const chestEntity = chestsRef.current.get(chestId)
                                if (chestEntity) {
                                    mapContainer.removeChild(chestEntity.getContainer())
                                    chestEntity.destroy()
                                    chestsRef.current.delete(chestId)
                                    if (nearbyChest === chestId) {
                                        setNearbyChest(null)
                                    }
                                }
                            }
                        },
                        onBossSpawned: async (bosses) => {
                            // Remove existing boss entities
                            for (const [, boss] of bossesRef.current) {
                                mapContainer.removeChild(boss.getContainer())
                                boss.destroy()
                            }
                            bossesRef.current.clear()

                            // Add new boss entities
                            const { BossEntity } = await import('./BossEntity')
                            for (const bossData of bosses) {
                                const bossEntity = new BossEntity(bossData)
                                mapContainer.addChild(bossEntity.getContainer())
                                bossesRef.current.set(bossData.id, bossEntity)
                            }
                            console.log(`👹 Boss spawns reloaded: ${bosses.length} bosses`)
                        },
                        onBossSpawnCountdown: (data) => {
                            if (!data.events || data.events.length === 0) {
                                setBossSpawnCountdown(null)
                                return
                            }
                            const nearest = [...data.events].sort((a, b) => a.remainingSeconds - b.remainingSeconds)[0]
                            setBossSpawnCountdown({
                                bossName: nearest.bossName,
                                remainingSeconds: nearest.remainingSeconds,
                            })
                        },
                        onBossQuestion: (data) => {
                            setQuestionData({
                                bossSpawnId: data.bossSpawnId,
                                questionId: data.questionId,
                                question: data.question,
                                timeLimit: data.timeLimit,
                            })
                        },
                        onBossGrading: () => {
                            setIsGrading(true)
                        },
                        onBossAnswerResult: (result) => {
                            setIsGrading(false)
                            setQuestionData(null)
                            if (result.success) {
                                setNotification(result.message || `正解！ +1ポイント ⚔️ダメージ`)
                                setTimeout(() => setNotification(null), 2500)
                            } else {
                                setNotification(result.message || '不正解です')
                                setTimeout(() => setNotification(null), 2500)
                            }
                        },
                        onBossDamaged: async (data) => {
                            const bossEntity = bossesRef.current.get(data.bossSpawnId)
                            if (bossEntity) {
                                // Use server-authoritative HP
                                bossEntity.setHp(data.currentHp)
                                console.log(
                                    `⚔️ Boss ${data.bossSpawnId} took ${data.damage} damage, HP: ${data.currentHp}`
                                )

                                // Boss died — play death animation and remove
                                if (data.defeated) {
                                    console.log(`💀 Boss ${data.bossSpawnId} defeated!`)
                                    await bossEntity.playDeathAnimation()
                                    mapContainer.removeChild(bossEntity.getContainer())
                                    bossEntity.destroy()
                                    bossesRef.current.delete(data.bossSpawnId)

                                    // Clear nearby boss state if this was the nearby boss
                                    if (nearbyBossRef.current === data.bossSpawnId) {
                                        nearbyBossRef.current = null
                                        setNearbyBoss(null)
                                        setNearbyBossPos(null)
                                    }
                                }
                            }
                        },
                        onChestQuestion: (data) => {
                            setQuestionData({
                                chestId: data.chestId,
                                question: data.question,
                                timeLimit: data.timeLimit,
                            })
                        },
                        onChestGrading: (data) => {
                            console.log('🤖 AI is grading answer for chest:', data.chestId)
                            setIsGrading(true)
                        },
                        onChestTimeout: (data) => {
                            setQuestionData(null)
                            setIsGrading(false)
                            setNotification(data.message || 'タイムアウトしました')
                            setTimeout(() => setNotification(null), 2000)
                        },
                        onChestOpened: async (data) => {
                            const chestEntity = chestsRef.current.get(data.chestId)
                            if (chestEntity) {
                                console.log('🎉 Playing open animation for chest:', data.chestId)
                                await chestEntity.playOpenAnimation()
                            }
                        },
                        onChestAnswerResult: async (result) => {
                            setIsGrading(false)
                            setQuestionData(null)
                            if (result.success) {
                                setNotification('正解！ +1ポイント')
                                setTimeout(() => setNotification(null), 2000)
                            } else {
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
                        onChestInteractResult: (result) => {
                            if (!result.success && result.reason) {
                                setNotification(result.reason)
                                setTimeout(() => setNotification(null), 2000)
                            }
                        },
                        onRankingUpdate: (rankingData) => {
                            setRanking(rankingData)
                        },
                        onWorldMessage: (message) => {
                            setWorldMessages((prev) => [...prev, message].slice(-100))
                        },
                    })

                    multiplayer.connect(playerName)
                    multiplayerRef.current = multiplayer
                    localMultiplayer = multiplayer
                }

                // Load item catalog / equipment / inventory (authenticated users)
                try {
                    const { authAPI, gameAPI, playerAPI, shopAPI } = await import('../services/api')
                    const catalogResult = await gameAPI.getItemCatalog()
                    if (catalogResult.success && Array.isArray(catalogResult.items)) {
                        setItemCatalog(mapServerCatalogToFrontend(catalogResult.items))
                    }
                    const worldMessageResult = await gameAPI.getWorldMessages(50)
                    if (worldMessageResult.success && Array.isArray(worldMessageResult.messages)) {
                        const asc = [...(worldMessageResult.messages as WorldMessageData[])].reverse()
                        setWorldMessages(asc)
                    }

                    const token = localStorage.getItem('token')
                    if (token) {
                        const storedUser = localStorage.getItem('user')
                        if (storedUser) {
                            try {
                                const parsedUser = JSON.parse(storedUser) as { totalScore?: number }
                                if (typeof parsedUser.totalScore === 'number') {
                                    setPlayerScore(parsedUser.totalScore)
                                }
                            } catch {
                                // ignore malformed user cache
                            }
                        }

                        const equipmentResult = await playerAPI.getEquipment()
                        if (equipmentResult.success && equipmentResult.equipment) {
                            const nextEquipment = equipmentResult.equipment as PlayerEquipment
                            setEquippedItems(nextEquipment)
                            await characterRef.current?.setEquipment(nextEquipment)
                        }

                        const inventoryResult = await playerAPI.getInventory()
                        if (inventoryResult.success && Array.isArray(inventoryResult.inventory)) {
                            setInventory(inventoryResult.inventory as string[])
                        }

                        if (itemCatalog.length === 0) {
                            const shopItemsResult = await shopAPI.getItems()
                            if (shopItemsResult.success && Array.isArray(shopItemsResult.items)) {
                                setItemCatalog(mapServerCatalogToFrontend(shopItemsResult.items))
                            }
                        }

                        const me = await authAPI.me()
                        if (me.success && me.user && typeof me.user.totalScore === 'number') {
                            setPlayerScore(me.user.totalScore)
                            localStorage.setItem('user', JSON.stringify(me.user))
                        }
                    }
                } catch {
                    // guest mode: keep default equipment (set 1)
                }

                // Don't center camera here - wait for character spawn
                // Camera will be centered when onGameInit receives player position
            } catch (error) {
                console.error('Failed to load game:', error)
            }
        }

        if (isMounted) {
            initGame()
        }

        // Cleanup
        return () => {
            isMounted = false
            // Disconnect multiplayer
            if (localMultiplayer) {
                localMultiplayer.disconnect()
            }
            // Cleanup remote players (use captured ref from effect start)
            remotePlayers.forEach((player) => player.destroy())
            remotePlayers.clear()
            // Cleanup input handler
            if (inputHandlerRef.current) {
                inputHandlerRef.current.destroy()
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isInitialized, playerName])

    useEffect(() => {
        setCurrentUsername(playerName)
        const stored = localStorage.getItem('user')
        if (stored) {
            try {
                const parsed = JSON.parse(stored) as { username?: string; email?: string | null }
                if (parsed.username) setCurrentUsername(parsed.username)
                setCurrentEmail(parsed.email || '')
            } catch {
                // ignore malformed cache
            }
        }
    }, [playerName])

    // Disable input when question popup is showing
    useEffect(() => {
        if (inputHandlerRef.current) {
            inputHandlerRef.current.setDisabled(questionData !== null)
        }
    }, [questionData])

    // Initialize game loop (only after character is ready)
    useGameLoop({
        app: appRef.current,
        mapContainer: mapContainerRef.current,
        character: characterReady ? characterRef.current : null,
        inputHandler: inputHandlerRef.current,
        multiplayer: multiplayerRef.current,
        collisionManager: collisionManagerRef.current,
        chestsRef,
        bossesRef,
        mapWidth: mapDimensionsRef.current.width,
        mapHeight: mapDimensionsRef.current.height,
        setNearbyChest,
        setNearbyChestPos,
        nearbyChestRef,
        setNearbyBoss,
        setNearbyBossPos,
        nearbyBossRef,
    })

    // Handle emoji selection
    const handleEmojiSelect = (emoji: string) => {
        // Show locally immediately
        if (characterRef.current) characterRef.current.showEmoji(emoji, 2000)
        // Send to server so others see it
        if (multiplayerRef.current) multiplayerRef.current.sendEmoji(emoji, 2000)
        setShowEmojiPicker(false)
    }

    const handleEquipItem = async (slot: 'head' | 'armor' | 'foot', itemId: string | null) => {
        if (!localStorage.getItem('token')) {
            setNotification('ログイン後に装備変更できます')
            setTimeout(() => setNotification(null), 1800)
            return
        }
        try {
            const { playerAPI } = await import('../services/api')
            const nextEquipment = { ...(equippedItems || {}), [slot]: itemId }
            const result = await playerAPI.updateEquipment(nextEquipment)
            if (result.success && result.equipment) {
                const updated = result.equipment as PlayerEquipment
                setEquippedItems(updated)
                await characterRef.current?.setEquipment(updated)
                setNotification('装備を変更しました')
                setTimeout(() => setNotification(null), 1800)
            } else {
                setNotification(result.error || '装備変更に失敗しました')
                setTimeout(() => setNotification(null), 1800)
            }
        } catch {
            setNotification('装備変更に失敗しました')
            setTimeout(() => setNotification(null), 1800)
        }
    }

    const handlePurchaseItem = async (itemId: string) => {
        if (!localStorage.getItem('token')) {
            setNotification('ログイン後に購入できます')
            setTimeout(() => setNotification(null), 1800)
            return
        }

        try {
            const { shopAPI, authAPI } = await import('../services/api')
            const result = await shopAPI.purchase(itemId)
            if (result.success) {
                if (Array.isArray(result.inventory)) {
                    setInventory(result.inventory as string[])
                }

                // Refresh user profile so current score is synced after spending points.
                try {
                    const me = await authAPI.me()
                    if (me.success && me.user) {
                        localStorage.setItem('user', JSON.stringify(me.user))
                        if (typeof me.user.totalScore === 'number') {
                            setPlayerScore(me.user.totalScore)
                        }
                    }
                } catch {
                    // ignore profile refresh errors
                }

                setNotification('購入しました')
                setTimeout(() => setNotification(null), 1800)
            } else {
                setNotification(result.error || '購入に失敗しました')
                setTimeout(() => setNotification(null), 1800)
            }
        } catch {
            setNotification('購入に失敗しました')
            setTimeout(() => setNotification(null), 1800)
        }
    }

    const handleLogout = async () => {
        try {
            const { authAPI } = await import('../services/api')
            await authAPI.logout()
        } catch {
            // ignore logout network errors
        } finally {
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            window.location.href = '/login'
        }
    }

    const handleUpdateProfile = async (data: { username: string; email: string }) => {
        try {
            const { authAPI } = await import('../services/api')
            const result = await authAPI.updateProfile({
                username: data.username,
                email: data.email,
            })
            if (!result.success || !result.user) {
                return { success: false, error: result.error || '更新に失敗しました' }
            }

            if (result.token) {
                localStorage.setItem('token', result.token)
            }
            localStorage.setItem('user', JSON.stringify(result.user))

            setCurrentUsername(result.user.username || data.username)
            setCurrentEmail(result.user.email || '')
            characterRef.current?.setName(result.user.username || data.username)
            multiplayerRef.current?.setName(result.user.username || data.username)

            setNotification('個人情報を更新しました')
            setTimeout(() => setNotification(null), 1800)
            return { success: true }
        } catch (error: unknown) {
            const err = error as { response?: { data?: { error?: string } } }
            return { success: false, error: err.response?.data?.error || '更新に失敗しました' }
        }
    }

    // Handle question answer submission (chest or boss)
    const handleSubmitAnswer = (answer: string) => {
        if (multiplayerRef.current && questionData) {
            if (questionData.bossSpawnId && questionData.questionId) {
                // Boss answer — via REST API
                multiplayerRef.current.submitBossAnswer(questionData.bossSpawnId, questionData.questionId, answer)
            } else if (questionData.chestId) {
                // Chest answer — via REST API
                multiplayerRef.current.submitAnswer(questionData.chestId, answer)
            }
        }
    }

    // Handle question cancel (chest or boss)
    const handleCancelQuestion = () => {
        if (multiplayerRef.current && questionData) {
            if (questionData.bossSpawnId) {
                multiplayerRef.current.cancelBossFight()
            } else if (questionData.chestId) {
                multiplayerRef.current.cancelSolving(questionData.chestId)
            }
        }
        setQuestionData(null)
    }

    return (
        <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
            <div
                ref={canvasRef}
                style={{
                    width: '100%',
                    height: '100vh',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    overflow: 'hidden',
                    opacity: characterReady ? 1 : 0,
                    transition: 'opacity 0.3s ease-in',
                }}
            />

            <GameUI
                showEmojiPicker={showEmojiPicker}
                setShowEmojiPicker={setShowEmojiPicker}
                notification={notification}
                onEmojiSelect={handleEmojiSelect}
                showInventory={showInventory}
                setShowInventory={setShowInventory}
                showShop={showShop}
                setShowShop={setShowShop}
                itemCatalog={itemCatalog}
                inventory={inventory}
                equippedItems={equippedItems}
                playerScore={playerScore}
                worldMessages={worldMessages}
                currentUsername={currentUsername}
                currentEmail={currentEmail}
                onEquipItem={handleEquipItem}
                onPurchaseItem={handlePurchaseItem}
                onLogout={handleLogout}
                onUpdateProfile={handleUpdateProfile}
            />

            <GameOverlays
                nearbyChest={nearbyChest}
                nearbyChestPos={nearbyChestPos}
                nearbyBoss={nearbyBoss}
                nearbyBossPos={nearbyBossPos}
                mapContainer={mapContainerRef.current}
                ranking={ranking}
                localPlayerId={multiplayerRef.current?.getLocalPlayerId() || null}
                questionData={questionData}
                isGrading={isGrading}
                bossSpawnCountdown={bossSpawnCountdown}
                onSubmitAnswer={handleSubmitAnswer}
                onCancelQuestion={handleCancelQuestion}
            />
        </div>
    )
}
