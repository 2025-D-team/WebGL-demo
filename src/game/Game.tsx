import { useEffect, useRef } from 'react'

import * as PIXI from 'pixi.js'

import { GameConfig } from '../config/gameConfig'
import { Character } from './Character'
import { CollisionManager } from './CollisionManager'
import { InputHandler } from './InputHandler'
import { MultiplayerManager, type PlayerData } from './MultiplayerManager'
import { RemotePlayer } from './RemotePlayer'
import { TiledMapLoader } from './TiledMapLoader'

export const Game = () => {
    const canvasRef = useRef<HTMLDivElement>(null)
    const appRef = useRef<PIXI.Application | null>(null)
    const characterRef = useRef<Character | null>(null)
    const inputHandlerRef = useRef<InputHandler | null>(null)
    const mapContainerRef = useRef<PIXI.Container | null>(null)
    const multiplayerRef = useRef<MultiplayerManager | null>(null)
    const remotePlayersRef = useRef<Map<string, RemotePlayer>>(new Map())

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
                const mapContainer = await mapLoader.loadMap('/maps/map_demo.tmj')
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

                // Initialize character at center of map
                const character = new Character(90, mapHeight / 1.5)
                await character.init()
                characterRef.current = character

                // Add character to mapContainer (so it moves with camera)
                mapContainer.addChild(character.getContainer())
                console.log('Character added to map at:', 90, mapHeight / 1.5)

                // Load collision objects from map
                const collisionManager = new CollisionManager()
                const collisionObjects = mapLoader.getCollisionObjects()
                collisionManager.loadFromTiledObjects(collisionObjects)

                // 🟥 DEBUG: Visualize collision boxes
                const debugGraphics = new PIXI.Graphics()
                for (const rect of collisionManager.getCollisionRects()) {
                    debugGraphics.rect(rect.x, rect.y, rect.width, rect.height)
                }
                debugGraphics.stroke({ width: 2, color: 0xff0000 }) // Red outline
                debugGraphics.alpha = 0.5
                mapContainer.addChild(debugGraphics)
                console.log('🟥 Debug: Drew collision boxes')

                // Initialize input handler
                const inputHandler = new InputHandler()
                inputHandlerRef.current = inputHandler

                // Initialize multiplayer
                if (GameConfig.multiplayer.enabled && mapContainer) {
                    const multiplayer = new MultiplayerManager({
                        onPlayerJoined: async (player: PlayerData) => {
                            console.log('🎮 Remote player joined:', player.id)
                            const remotePlayer = new RemotePlayer(player.id, player.x, player.y)
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
                    })
                    multiplayer.connect()
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

                    // Get input direction
                    const direction = inputHandler.getDirection()
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
    }, [])

    return (
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
    )
}
