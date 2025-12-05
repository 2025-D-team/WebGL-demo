import { useEffect, useRef, useState } from 'react'

import * as PIXI from 'pixi.js'

import { GameConfig } from '../config/gameConfig'
import { Character } from './Character'
import { ChestEntity } from './ChestEntity'
import { CollisionManager } from './CollisionManager'
import { InputHandler } from './InputHandler'
import { type ChestData, MultiplayerManager, type PlayerData, type RankingPlayer } from './MultiplayerManager'
import { QuestionPopup } from './QuestionPopup'
import { Ranking } from './Ranking'
import { RemotePlayer } from './RemotePlayer'
import { TiledMapLoader } from './TiledMapLoader'

export const Game = ({ playerName = '' }: { playerName?: string }) => {
    const canvasRef = useRef<HTMLDivElement>(null)
    const appRef = useRef<PIXI.Application | null>(null)
    const characterRef = useRef<Character | null>(null)
    const inputHandlerRef = useRef<InputHandler | null>(null)
    const mapContainerRef = useRef<PIXI.Container | null>(null)
    const multiplayerRef = useRef<MultiplayerManager | null>(null)
    const remotePlayersRef = useRef<Map<string, RemotePlayer>>(new Map())
    const chestsRef = useRef<Map<string, ChestEntity>>(new Map())
    const nearbyChestRef = useRef<string | null>(null)
    const [showEmojiPicker, setShowEmojiPicker] = useState(false)
    const [nearbyChest, setNearbyChest] = useState<string | null>(null)
    const [nearbyChestPos, setNearbyChestPos] = useState<{ x: number; y: number } | null>(null)
    const [notification, setNotification] = useState<string | null>(null)
    const [ranking, setRanking] = useState<RankingPlayer[]>([])
    const [questionData, setQuestionData] = useState<{
        chestId: string
        question: string
        timeLimit: number
    } | null>(null)

    const selectEmoji = (emoji: string) => {
        // Show locally immediately
        if (characterRef.current) characterRef.current.showEmoji(emoji, 2000)
        // Send to server so others see it
        if (multiplayerRef.current) multiplayerRef.current.sendEmoji(emoji, 2000)
        setShowEmojiPicker(false)
    }

    useEffect(() => {
        // Local copies for cleanup closure (avoid ref-value changed warnings)
        let localMultiplayer: MultiplayerManager | null = null
        const remotePlayers = remotePlayersRef.current

        const initGame = async () => {
            if (!canvasRef.current || appRef.current) return

            // Create PixiJS application
            const app = new PIXI.Application()
            await app.init({
                width: window.innerWidth,
                height: window.innerHeight,
                backgroundColor: GameConfig.renderer.backgroundColor,
                antialias: GameConfig.renderer.antialias,
                resolution: GameConfig.renderer.resolution,
                autoDensity: GameConfig.renderer.autoDensity,
            })

            appRef.current = app
            canvasRef.current.appendChild(app.canvas)

            // Load and render map
            try {
                const mapLoader = new TiledMapLoader()
                const mapContainer = await mapLoader.loadMap('/maps/map.tmj')
                mapContainerRef.current = mapContainer

                app.stage.addChild(mapContainer)

                // Get map dimensions
                const mapData = mapLoader.getMapData()
                let mapWidth = 3072
                let mapHeight = 3072

                if (mapData) {
                    mapWidth = mapData.width * mapData.tilewidth
                    mapHeight = mapData.height * mapData.tileheight
                    console.log(`Map size: ${mapWidth}x${mapHeight} pixels`)
                    console.log(`Grid: ${mapData.width}x${mapData.height} tiles`)

                    // Set 1:1 scale (100% zoom, no scaling)
                    mapContainer.scale.set(1)
                }

                // Character will be initialized after receiving game:init from server
                // (to get the spawn position from backend)

                // Load collision objects from map
                const collisionManager = new CollisionManager()
                const collisionObjects = mapLoader.getCollisionObjects()
                collisionManager.loadFromTiledObjects(collisionObjects)

                // // 🟥 DEBUG: Visualize collision boxes
                // const debugGraphics = new PIXI.Graphics()
                // for (const rect of collisionManager.getCollisionRects()) {
                //     debugGraphics.rect(rect.x, rect.y, rect.width, rect.height)
                // }
                // debugGraphics.stroke({ width: 2, color: 0xff0000 }) // Red outline
                // debugGraphics.alpha = 0.5
                // mapContainer.addChild(debugGraphics)
                // console.log('🟥 Debug: Drew collision boxes')

                // Initialize input handler
                const inputHandler = new InputHandler()
                inputHandlerRef.current = inputHandler

                // Register F key interaction handler
                inputHandler.onInteract(() => {
                    // Get closest chest from state
                    if (nearbyChestRef.current && multiplayerRef.current) {
                        console.log('🎯 Interacting with chest:', nearbyChestRef.current)
                        multiplayerRef.current.interactWithChest(nearbyChestRef.current)
                    }
                })

                // Initialize multiplayer
                if (GameConfig.multiplayer.enabled && mapContainer && !multiplayerRef.current) {
                    const multiplayer = new MultiplayerManager({
                        onGameInit: async (initData) => {
                            // Find local player data from server
                            const localPlayerData = initData.players.find((p) => p.id === initData.playerId)
                            if (localPlayerData && !characterRef.current) {
                                // Initialize character with position from server
                                console.log(
                                    '🎮 Creating character at server position:',
                                    localPlayerData.x,
                                    localPlayerData.y
                                )
                                const character = new Character(localPlayerData.x, localPlayerData.y, playerName)
                                await character.init()
                                characterRef.current = character
                                mapContainer.addChild(character.getContainer())
                            }
                        },
                        onPlayerJoined: async (player: PlayerData) => {
                            console.log('🎮 Remote player joined:', player.id)
                            const remotePlayer = new RemotePlayer(player.id, player.x, player.y, player.name)
                            await remotePlayer.init()
                            mapContainer.addChild(remotePlayer.getContainer())
                            remotePlayersRef.current.set(player.id, remotePlayer)
                        },
                        onPlayerMoved: (player: PlayerData) => {
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
                        onPlayerLeft: (playerId: string) => {
                            console.log('👋 Remote player left:', playerId)
                            const remotePlayer = remotePlayersRef.current.get(playerId)
                            if (remotePlayer) {
                                mapContainer.removeChild(remotePlayer.getContainer())
                                remotePlayer.destroy()
                                remotePlayersRef.current.delete(playerId)
                            }
                        },
                        onPlayerUpdated: (player: PlayerData) => {
                            // Update name for an existing remote player
                            const remotePlayer = remotePlayersRef.current.get(player.id)
                            if (remotePlayer && player.name !== undefined) {
                                remotePlayer.setName(player.name)
                            }
                            // If update refers to local player, update local label
                            const localId = multiplayerRef.current?.getLocalPlayerId()
                            if (localId === player.id && player.name !== undefined && characterRef.current) {
                                characterRef.current.setName(player.name)
                            }
                        },
                        onPlayerEmoji: (data) => {
                            // Display emoji for remote or local players
                            const localId = multiplayerRef.current?.getLocalPlayerId()
                            if (data.id === localId) {
                                // Update local character
                                if (characterRef.current) characterRef.current.showEmoji(data.emoji, data.duration)
                            } else {
                                const remote = remotePlayersRef.current.get(data.id)
                                if (remote) remote.showEmoji(data.emoji, data.duration)
                            }
                        },
                        onPlayerStatus: (data) => {
                            // Update status for remote or local players
                            const localId = multiplayerRef.current?.getLocalPlayerId()
                            if (data.id === localId) {
                                // Update local character status
                                if (characterRef.current) characterRef.current.setStatus(data.status)
                            } else {
                                const remote = remotePlayersRef.current.get(data.id)
                                if (remote) remote.setStatus(data.status)
                            }
                        },
                        onInitialChests: (chests: ChestData[]) => {
                            // Receive initial visible chests from server on connect
                            console.log('📦 Initial chests:', chests)
                            for (const chest of chests) {
                                if (!chestsRef.current.has(chest.id)) {
                                    const chestEntity = new ChestEntity({
                                        id: chest.id,
                                        x: chest.x,
                                        y: chest.y,
                                    })
                                    if (mapContainer) mapContainer.addChild(chestEntity.getContainer())
                                    chestsRef.current.set(chest.id, chestEntity)
                                }
                            }
                        },
                        onChestAppear: (chests: ChestData[]) => {
                            // New chests appeared in visibility range
                            for (const chest of chests) {
                                console.log('👁️ Chest appeared:', chest.id)
                                if (!chestsRef.current.has(chest.id)) {
                                    const chestEntity = new ChestEntity({
                                        id: chest.id,
                                        x: chest.x,
                                        y: chest.y,
                                    })
                                    if (mapContainer) mapContainer.addChild(chestEntity.getContainer())
                                    chestsRef.current.set(chest.id, chestEntity)
                                }
                            }
                        },
                        onChestDisappear: (chestIds: string[]) => {
                            // Chests disappeared - remove from map
                            for (const chestId of chestIds) {
                                console.log('👋 Chest disappeared:', chestId)

                                const chestEntity = chestsRef.current.get(chestId)
                                if (chestEntity) {
                                    // Remove chest from map (animation already played via chest:opened)
                                    if (mapContainer) mapContainer.removeChild(chestEntity.getContainer())
                                    chestEntity.destroy()
                                    chestsRef.current.delete(chestId)

                                    // Clear nearby hint if this was the nearby chest
                                    if (nearbyChest === chestId) {
                                        setNearbyChest(null)
                                    }
                                }
                            }
                        },
                        onChestQuestion: (data) => {
                            // Show question popup
                            setQuestionData({
                                chestId: data.chestId,
                                question: data.question,
                                timeLimit: data.timeLimit,
                            })
                        },
                        onChestTimeout: (data) => {
                            // Close popup and show timeout notification
                            setQuestionData(null)
                            setNotification(data.message || 'タイムアウトしました')
                            setTimeout(() => setNotification(null), 2000)
                        },
                        onChestOpened: async (data) => {
                            // Chest was opened by someone - play animation for all players
                            const chestEntity = chestsRef.current.get(data.chestId)
                            if (chestEntity) {
                                console.log('🎉 Playing open animation for chest:', data.chestId)
                                await chestEntity.playOpenAnimation()
                                // Chest will be removed by entity:disappear event after animation
                            }
                        },
                        onChestAnswerResult: async (result) => {
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
                        onChestInteractResult: (result) => {
                            // Handle errors from interact request (not from answer)
                            if (!result.success && result.reason) {
                                setNotification(result.reason)
                                setTimeout(() => setNotification(null), 2000)
                            }
                        },
                        onRankingUpdate: (rankingData: RankingPlayer[]) => {
                            setRanking(rankingData)
                        },
                    })
                    // Pass the playerName from App to the server on connect so server stores it on join
                    multiplayer.connect(playerName)
                    multiplayerRef.current = multiplayer
                    localMultiplayer = multiplayer
                }

                // Camera deadzone settings from config
                const deadzoneWidth = window.innerWidth * GameConfig.camera.deadzoneWidthPercent
                const deadzoneHeight = window.innerHeight * GameConfig.camera.deadzoneHeightPercent

                // Map bounds with padding from config
                const padding = GameConfig.map.padding
                const mapBounds = {
                    minX: padding,
                    maxX: mapWidth - padding,
                    minY: padding,
                    maxY: mapHeight - padding,
                }

                // Initial camera position - center on character
                mapContainerRef.current.x = window.innerWidth / 2 - mapWidth / 2
                mapContainerRef.current.y = window.innerHeight / 2 - mapHeight / 2

                // Game loop - update character and camera with deadzone
                app.ticker.add((ticker) => {
                    if (!characterRef.current || !mapContainerRef.current) return

                    // Get delta time in seconds (framerate independent movement)
                    const deltaTime = ticker.deltaMS / 1000

                    // Block movement when player is busy (solving questions, etc.)
                    const isBusy = characterRef.current.isBusy()

                    // Get input direction (null if busy)
                    const direction = isBusy ? null : inputHandler.getDirection()
                    const isMoving = direction !== null

                    // Move character (with map bounds and collision check)
                    const charSize = characterRef.current.getSize()
                    characterRef.current.move(direction, deltaTime, mapBounds, (newX, newY, oldX, oldY) =>
                        collisionManager.getValidPosition(newX, newY, oldX, oldY, charSize.width, charSize.height)
                    )

                    // Send position to multiplayer server (only when moving to reduce bandwidth)
                    if (multiplayerRef.current && multiplayerRef.current.isConnected()) {
                        const pos = characterRef.current.getPosition()
                        const dir = characterRef.current.getCurrentDirection()
                        // Always send updates to keep sync, but include isMoving flag
                        multiplayerRef.current.sendPosition(pos.x, pos.y, dir, isMoving)
                    }

                    // Camera follow with deadzone
                    const charPos = characterRef.current.getPosition()
                    const mapContainer = mapContainerRef.current

                    // Calculate character position in screen space
                    const charScreenX = charPos.x + mapContainer.x
                    const charScreenY = charPos.y + mapContainer.y

                    // Calculate deadzone boundaries (centered on screen)
                    const deadzoneLeft = (window.innerWidth - deadzoneWidth) / 2
                    const deadzoneRight = (window.innerWidth + deadzoneWidth) / 2
                    const deadzoneTop = (window.innerHeight - deadzoneHeight) / 2
                    const deadzoneBottom = (window.innerHeight + deadzoneHeight) / 2

                    // Adjust camera if character exits deadzone
                    if (charScreenX < deadzoneLeft) {
                        mapContainer.x += deadzoneLeft - charScreenX
                    } else if (charScreenX > deadzoneRight) {
                        mapContainer.x -= charScreenX - deadzoneRight
                    }

                    if (charScreenY < deadzoneTop) {
                        mapContainer.y += deadzoneTop - charScreenY
                    } else if (charScreenY > deadzoneBottom) {
                        mapContainer.y -= charScreenY - deadzoneBottom
                    }

                    // Clamp camera to map bounds (prevent showing outside map)
                    const minCameraX = window.innerWidth - mapWidth
                    const maxCameraX = 0
                    const minCameraY = window.innerHeight - mapHeight
                    const maxCameraY = 0

                    mapContainer.x = Math.max(minCameraX, Math.min(mapContainer.x, maxCameraX))
                    mapContainer.y = Math.max(minCameraY, Math.min(mapContainer.y, maxCameraY))

                    // Check distance to all visible chests for interaction hint
                    const R2 = 48 // Interaction radius (increased to match 1.5x chest scale)
                    let closestChest: string | null = null
                    let closestDist = Infinity

                    for (const [chestId, chestEntity] of chestsRef.current.entries()) {
                        const chestPos = chestEntity.getPosition()
                        const dx = charPos.x - chestPos.x
                        const dy = charPos.y - chestPos.y
                        const dist = Math.sqrt(dx * dx + dy * dy)

                        if (dist <= R2 && dist < closestDist) {
                            closestDist = dist
                            closestChest = chestId
                        }
                    }

                    setNearbyChest(closestChest)
                    if (closestChest) {
                        const chestEntity = chestsRef.current.get(closestChest)
                        if (chestEntity) {
                            setNearbyChestPos(chestEntity.getPosition())
                        }
                    } else {
                        setNearbyChestPos(null)
                    }
                    nearbyChestRef.current = closestChest
                })
            } catch (error) {
                console.error('Failed to load game:', error)
            }
        }

        initGame()

        // Cleanup
        return () => {
            // Disconnect multiplayer (use captured localMultiplayer)
            if (localMultiplayer) {
                localMultiplayer.disconnect()
            }
            // Cleanup remote players (use captured remotePlayers)
            remotePlayers.forEach((player) => player.destroy())
            remotePlayers.clear()
            // Cleanup input handler
            if (inputHandlerRef.current) {
                inputHandlerRef.current.destroy()
            }
            // Cleanup PixiJS app
            if (appRef.current) {
                appRef.current.destroy(true, { children: true })
                appRef.current = null
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [playerName])

    // Emoji list for picker
    const emojis = [
        '😄',
        '😀',
        '😂',
        '🤣',
        '😊',
        '🙂',
        '😉',
        '😍',
        '😘',
        '🥰',
        '😇',
        '🤩',
        '😮',
        '😲',
        '😢',
        '😡',
        '😤',
        '😱',
        '👍',
        '👎',
        '👏',
        '🙏',
        '🤝',
        '🤘',
        '🤞',
        '✌️',
        '👌',
        '🤏',
        '🎉',
        '🎊',
        '❤️',
        '💔',
        '🔥',
        '🌟',
        '✨',
        '⭐',
        '🌈',
        '☀️',
        '🍕',
        '🍔',
        '🍣',
        '🍩',
        '🍪',
        '☕',
        '🍺',
        '🍷',
        '🏆',
        '🎮',
        '🐶',
        '🐱',
        '🐼',
        '🐵',
        '🦊',
        '🦁',
        '🐯',
        '🐸',
        '🐙',
        '🐧',
        '🤖',
        '👾',
        '💡',
        '📣',
        '📌',
        '🔔',
        '🎵',
        '🎧',
        '🧭',
        '🪄',
    ]

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
                }}
            />

            {/* Emoji button + picker (DOM overlay) */}
            <div style={{ position: 'absolute', bottom: 20, right: 20, zIndex: 9999 }}>
                <button
                    onClick={() => setShowEmojiPicker((s) => !s)}
                    style={{ padding: '8px 12px', fontSize: 16, borderRadius: 8 }}
                >
                    😊
                </button>

                {showEmojiPicker && (
                    <div
                        style={{
                            marginTop: 8,
                            background: 'rgba(0,0,0,0.85)',
                            padding: 8,
                            borderRadius: 8,
                            display: 'grid',
                            gridTemplateColumns: 'repeat(6, 40px)',
                            gap: 8,
                            maxHeight: 220,
                            overflowY: 'auto',
                            boxShadow: '0 6px 30px rgba(0,0,0,0.5)',
                        }}
                    >
                        {emojis.map((e) => (
                            <button
                                key={e}
                                onClick={() => selectEmoji(e)}
                                style={{ fontSize: 20, width: 40, height: 40, borderRadius: 6 }}
                            >
                                {e}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Chest interaction hint */}
            {nearbyChest &&
                nearbyChestPos &&
                mapContainerRef.current &&
                (() => {
                    const chestScreenX = nearbyChestPos.x + mapContainerRef.current.x
                    const chestScreenY = nearbyChestPos.y + mapContainerRef.current.y
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

            {/* Success notification popup */}
            {notification && (
                <div
                    style={{
                        position: 'absolute',
                        top: 20,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'rgba(255, 255, 255, 0.95)',
                        color: '#333',
                        padding: '8px 16px',
                        borderRadius: 8,
                        fontSize: 14,
                        fontWeight: '500',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                        zIndex: 10000,
                        pointerEvents: 'none',
                        border: '1px solid rgba(0, 0, 0, 0.1)',
                    }}
                >
                    ✓ {notification}
                </div>
            )}

            {/* World Ranking */}
            <Ranking
                players={ranking}
                localPlayerId={multiplayerRef.current?.getLocalPlayerId() || null}
            />

            {/* Question Popup */}
            {questionData && (
                <QuestionPopup
                    question={questionData.question}
                    timeLimit={questionData.timeLimit}
                    onSubmit={(answer) => {
                        if (multiplayerRef.current) {
                            multiplayerRef.current.submitAnswer(questionData.chestId, answer)
                        }
                    }}
                    onCancel={() => {
                        // Cancel solving on backend
                        if (multiplayerRef.current && questionData) {
                            multiplayerRef.current.cancelSolving(questionData.chestId)
                        }
                        setQuestionData(null)
                    }}
                />
            )}
        </div>
    )
}
