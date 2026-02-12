import { useEffect, useRef } from 'react'

import { GameConfig } from '../config/gameConfig'
import { CollisionManager } from './CollisionManager'
import { TiledMapLoader } from './TiledMapLoader'
import { GameOverlays } from './components/GameOverlays'
import { GameUI } from './components/GameUI'
import { useGameEngine } from './hooks/useGameEngine'
import { useGameLoop } from './hooks/useGameLoop'
import { useGameState } from './hooks/useGameState'

export const Game = ({ playerName = '' }: { playerName?: string }) => {
    const canvasRef = useRef<HTMLDivElement | null>(null)

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
        let localMultiplayer: any = null
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
                                    playerName
                                )
                                await character.init()
                                characterRef.current = character
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
                                player.name
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
                    })

                    multiplayer.connect(playerName)
                    multiplayerRef.current = multiplayer
                    localMultiplayer = multiplayer
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
                onSubmitAnswer={handleSubmitAnswer}
                onCancelQuestion={handleCancelQuestion}
            />
        </div>
    )
}
