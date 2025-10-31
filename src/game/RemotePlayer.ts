import * as PIXI from 'pixi.js'

import { GameConfig } from '../config/gameConfig'

export class RemotePlayer {
    private container: PIXI.Container
    private sprite: PIXI.AnimatedSprite | null = null
    private currentDirection: 'down' | 'up' | 'left' | 'right' = 'down'
    private playerId: string
    private nameText: PIXI.Text
    private nameBgTexts: PIXI.Text[] = []
    private isMoving: boolean = false

    constructor(playerId: string, x: number, y: number, name?: string) {
        this.playerId = playerId
        this.container = new PIXI.Container()
        this.container.x = x
        this.container.y = y

        // Add player name label using simple bg copies for a clear outline + white foreground
        const displayName = name && name.trim().length > 0 ? name.trim() : `Player ${playerId.slice(0, 6)}`
        const fgStyle = { fontFamily: 'Arial', fontSize: 14, fill: '#ffffff' }
        const bgStyle = { fontFamily: 'Arial', fontSize: 14, fill: '#000000' }

        const offsets: [number, number][] = [
            [-1, 0],
            [1, 0],
            [0, -1],
            [0, 1],
        ]

        for (const [ox, oy] of offsets) {
            const bg = new PIXI.Text(displayName, new PIXI.TextStyle(bgStyle))
            bg.anchor.set(0.5, 1)
            bg.x = ox
            bg.y = -GameConfig.character.size - 5 + oy
            bg.resolution = 2
            this.container.addChild(bg)
            this.nameBgTexts.push(bg)
        }

        this.nameText = new PIXI.Text(displayName, new PIXI.TextStyle(fgStyle))
        this.nameText.anchor.set(0.5, 1)
        this.nameText.y = -GameConfig.character.size - 5
        this.nameText.resolution = 2
        this.container.addChild(this.nameText)
    }

    setName(name: string) {
        const display = name && name.trim().length > 0 ? name.trim() : `Player ${this.playerId.slice(0, 6)}`
        this.nameText.text = display
        this.nameBgTexts.forEach((t: PIXI.Text) => (t.text = display))
    }

    async init(): Promise<void> {
        // Load default animation (walk down)
        await this.loadAnimation('down')
    }

    private async loadAnimation(direction: 'down' | 'up' | 'left' | 'right'): Promise<void> {
        const basePath = GameConfig.assets.characterFrames
        const frameCount = GameConfig.animations.walkDown // All directions have same frame count

        const textures: PIXI.Texture[] = []
        // Some maps / assets don't include separate left-facing frames.
        // The project convention is: use 'walk-right' frames and flip for left.
        const sourceDirection = direction === 'left' ? 'right' : direction
        for (let i = 1; i <= frameCount; i++) {
            const framePath = `${basePath}/walk-${sourceDirection}-${i.toString().padStart(3, '0')}.png`
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
        this.nameBgTexts.forEach((t) => t.destroy())
        this.nameText.destroy()
        this.container.destroy()
    }
}
