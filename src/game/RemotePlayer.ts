import * as PIXI from 'pixi.js'

import { GameConfig } from '../config/gameConfig'

export class RemotePlayer {
    private container: PIXI.Container
    private sprite: PIXI.AnimatedSprite | null = null
    private currentDirection: 'down' | 'up' | 'left' | 'right' = 'down'
    private playerId: string
    private nameText: PIXI.Text
    private isMoving: boolean = false

    constructor(playerId: string, x: number, y: number) {
        this.playerId = playerId
        this.container = new PIXI.Container()
        this.container.x = x
        this.container.y = y

        // Add player name label
        this.nameText = new PIXI.Text({
            text: `Player ${playerId.slice(0, 6)}`,
            style: {
                fontFamily: 'Arial',
                fontSize: 12,
                fill: 0xffffff,
                align: 'center',
            },
        })
        this.nameText.anchor.set(0.5, 1)
        this.nameText.y = -GameConfig.character.size - 5
        this.container.addChild(this.nameText)
    }

    async init(): Promise<void> {
        // Load default animation (walk down)
        await this.loadAnimation('down')
    }

    private async loadAnimation(direction: 'down' | 'up' | 'left' | 'right'): Promise<void> {
        const basePath = GameConfig.assets.characterFrames
        const frameCount = GameConfig.animations.walkDown // All directions have same frame count

        const textures: PIXI.Texture[] = []
        for (let i = 1; i <= frameCount; i++) {
            const framePath = `${basePath}/walk-${direction}-${i.toString().padStart(3, '0')}.png`
            const texture = await PIXI.Assets.load(framePath)
            textures.push(texture)
        }

        // Remove old sprite if exists
        if (this.sprite) {
            this.container.removeChild(this.sprite)
            this.sprite.destroy()
        }

        // Create new animated sprite
        this.sprite = new PIXI.AnimatedSprite(textures)
        this.sprite.animationSpeed = GameConfig.character.animationSpeed

        // Center sprite
        this.sprite.anchor.set(0.5, 0.5)

        // Scale sprite to match character size (sprite is 480px, we want tileSize)
        const tileSize = GameConfig.map.tileSize
        const frameSize = 480 // Original GIF frame size
        const scale = tileSize / frameSize
        this.sprite.scale.set(scale)

        // Flip horizontally if facing left (keep scale magnitude)
        if (direction === 'left') {
            this.sprite.scale.x = -Math.abs(scale) // Force negative for left
        } else {
            this.sprite.scale.x = Math.abs(scale) // Force positive for other directions
        }

        this.container.addChild(this.sprite)

        // Apply current movement state AFTER sprite is created
        if (this.isMoving) {
            this.sprite.play()
        } else {
            this.sprite.gotoAndStop(0) // Idle frame
        }
    }

    updatePosition(x: number, y: number, direction: 'down' | 'up' | 'left' | 'right', isMoving: boolean = true): void {
        // Smooth interpolation (lerp)
        const lerpFactor = 0.15
        this.container.x += (x - this.container.x) * lerpFactor
        this.container.y += (y - this.container.y) * lerpFactor

        // Update animation if direction changed
        if (direction !== this.currentDirection) {
            this.currentDirection = direction
            this.isMoving = isMoving // Update before loading to ensure correct state
            this.loadAnimation(direction)
        } else {
            // Direction same, just update movement state
            if (isMoving !== this.isMoving) {
                this.isMoving = isMoving
                if (this.sprite) {
                    if (isMoving) {
                        this.sprite.play()
                    } else {
                        this.sprite.gotoAndStop(0) // Show idle frame
                    }
                }
            }
        }
    }

    getContainer(): PIXI.Container {
        return this.container
    }

    getPlayerId(): string {
        return this.playerId
    }

    destroy(): void {
        if (this.sprite) {
            this.sprite.destroy()
        }
        this.nameText.destroy()
        this.container.destroy()
    }
}
