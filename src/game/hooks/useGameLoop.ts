import { useEffect } from 'react'

import * as PIXI from 'pixi.js'

import { GameConfig } from '../../config/gameConfig'
import { BossEntity } from '../BossEntity'
import { Character } from '../Character'
import { ChestEntity } from '../ChestEntity'
import { CollisionManager } from '../CollisionManager'
import { InputHandler } from '../InputHandler'
import { MultiplayerManager } from '../MultiplayerManager'

interface UseGameLoopOptions {
    app: PIXI.Application | null
    mapContainer: PIXI.Container | null
    character: Character | null
    inputHandler: InputHandler | null
    multiplayer: MultiplayerManager | null
    collisionManager: CollisionManager
    chestsRef: React.RefObject<Map<string, ChestEntity>>
    bossesRef: React.RefObject<Map<number, BossEntity>>
    mapWidth: number
    mapHeight: number
    setNearbyChest: (chestId: string | null) => void
    setNearbyChestPos: (pos: { x: number; y: number } | null) => void
    nearbyChestRef: React.RefObject<string | null>
    setNearbyBoss: (bossId: number | null) => void
    setNearbyBossPos: (pos: { x: number; y: number } | null) => void
    nearbyBossRef: React.RefObject<number | null>
}

/**
 * Hook to manage the game loop (ticker)
 * Handles character movement, camera follow, and chest interaction detection
 */
export const useGameLoop = ({
    app,
    mapContainer,
    character,
    inputHandler,
    multiplayer,
    collisionManager,
    chestsRef,
    bossesRef,
    mapWidth,
    mapHeight,
    setNearbyChest,
    setNearbyChestPos,
    nearbyChestRef,
    setNearbyBoss,
    setNearbyBossPos,
    nearbyBossRef,
}: UseGameLoopOptions) => {
    useEffect(() => {
        if (!app || !mapContainer || !character || !inputHandler) return

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

        // Game loop - update character and camera with deadzone
        const tickerFn = (ticker: PIXI.Ticker) => {
            if (!character || !mapContainer) return

            // Get delta time in seconds (framerate independent movement)
            const deltaTime = ticker.deltaMS / 1000

            // Block movement when player is busy (solving questions, etc.)
            const isBusy = character.isBusy()

            // Get input direction (null if busy)
            const direction = isBusy ? null : inputHandler.getDirection()
            const isMoving = direction !== null

            // Move character (with map bounds and collision check)
            const charSize = character.getSize()
            character.move(direction, deltaTime, mapBounds, (newX, newY, oldX, oldY) =>
                collisionManager.getValidPosition(newX, newY, oldX, oldY, charSize.width, charSize.height)
            )

            // Send position to multiplayer server (only when moving to reduce bandwidth)
            if (multiplayer && multiplayer.isConnected()) {
                const pos = character.getPosition()
                const dir = character.getCurrentDirection()
                // Always send updates to keep sync, but include isMoving flag
                multiplayer.sendPosition(pos.x, pos.y, dir, isMoving)
            }

            // Camera follow with deadzone
            const charPos = character.getPosition()

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

            for (const [chestId, chestEntity] of chestsRef.current?.entries() ?? []) {
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
                const chestEntity = chestsRef.current?.get(closestChest)
                if (chestEntity) {
                    setNearbyChestPos(chestEntity.getPosition())
                }
            } else {
                setNearbyChestPos(null)
            }
            nearbyChestRef.current = closestChest

            // Check distance to all visible bosses for interaction hint
            const BOSS_R = BossEntity.getInteractRadius()
            let closestBoss: number | null = null
            let closestBossDist = Infinity

            for (const [bossId, bossEntity] of bossesRef.current?.entries() ?? []) {
                const bossPos = bossEntity.getPosition()
                const dx = charPos.x - bossPos.x
                const dy = charPos.y - bossPos.y
                const dist = Math.sqrt(dx * dx + dy * dy)

                if (dist <= BOSS_R && dist < closestBossDist) {
                    closestBossDist = dist
                    closestBoss = bossId
                }
            }

            setNearbyBoss(closestBoss)
            if (closestBoss) {
                const bossEntity = bossesRef.current?.get(closestBoss)
                if (bossEntity) {
                    setNearbyBossPos(bossEntity.getPosition())
                }
            } else {
                setNearbyBossPos(null)
            }
            nearbyBossRef.current = closestBoss
        }

        app.ticker.add(tickerFn)

        return () => {
            app.ticker.remove(tickerFn)
        }
    }, [
        app,
        mapContainer,
        character,
        inputHandler,
        multiplayer,
        collisionManager,
        chestsRef,
        bossesRef,
        mapWidth,
        mapHeight,
        setNearbyChest,
        setNearbyChestPos,
        nearbyChestRef,
        setNearbyBoss,
        setNearbyBossPos,
        nearbyBossRef,
    ])
}
