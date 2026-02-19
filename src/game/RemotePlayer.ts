import * as PIXI from 'pixi.js'

import { GameConfig } from '../config/gameConfig'
import { LoadingIndicator } from './LoadingIndicator'
import { EquipmentLayer } from './equipment/EquipmentService'
import { type PlayerEquipment } from './equipment/types'

export class RemotePlayer {
    private container: PIXI.Container
    private avatarLayer: PIXI.Container
    private uiLayer: PIXI.Container
    private sprite: PIXI.AnimatedSprite | null = null
    private currentDirection: 'down' | 'up' | 'left' | 'right' = 'down'
    private playerId: string
    private nameText: PIXI.Text
    private nameBgTexts: PIXI.Text[] = []
    private isMoving: boolean = false
    private emojiText: PIXI.Text | null = null
    private loadingIndicator: LoadingIndicator
    private equipmentLayer: EquipmentLayer

    constructor(playerId: string, x: number, y: number, name?: string, equipment?: PlayerEquipment) {
        this.playerId = playerId
        this.container = new PIXI.Container()
        this.avatarLayer = new PIXI.Container()
        this.avatarLayer.sortableChildren = true
        this.uiLayer = new PIXI.Container()
        this.container.addChild(this.avatarLayer)
        this.container.addChild(this.uiLayer)
        this.container.x = x
        this.container.y = y

        this.equipmentLayer = new EquipmentLayer(equipment)
        const equipmentContainer = this.equipmentLayer.getContainer()
        equipmentContainer.zIndex = 30
        this.avatarLayer.addChild(equipmentContainer)

        // Initialize loading indicator
        this.loadingIndicator = new LoadingIndicator()
        this.loadingIndicator.setPosition(0, -GameConfig.character.size - 30)
        this.uiLayer.addChild(this.loadingIndicator.getContainer())

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
            this.uiLayer.addChild(bg)
            this.nameBgTexts.push(bg)
        }

        this.nameText = new PIXI.Text(displayName, new PIXI.TextStyle(fgStyle))
        this.nameText.anchor.set(0.5, 1)
        this.nameText.y = -GameConfig.character.size - 5
        this.nameText.resolution = 2
        this.uiLayer.addChild(this.nameText)
    }

    setName(name: string) {
        const display = name && name.trim().length > 0 ? name.trim() : `Player ${this.playerId.slice(0, 6)}`
        this.nameText.text = display
        this.nameBgTexts.forEach((t: PIXI.Text) => (t.text = display))
    }

    setStatus(status: 'idle' | 'busy') {
        if (status === 'busy') {
            this.loadingIndicator.show()
        } else {
            this.loadingIndicator.hide()
        }
    }

    showEmoji(emoji: string, duration = 2000) {
        if (this.emojiText) {
            this.emojiText.destroy()
            this.emojiText = null
        }
        if (!emoji) return
        const style = new PIXI.TextStyle({ fontSize: 28, fontFamily: 'Arial' })
        const txt = new PIXI.Text(emoji, style)
        txt.anchor.set(0.5, 1)
        txt.y = -GameConfig.character.size - 25
        txt.resolution = 2
        this.uiLayer.addChild(txt)
        this.emojiText = txt

        setTimeout(() => {
            if (this.emojiText) {
                this.emojiText.destroy()
                this.emojiText = null
            }
        }, duration)
    }

    async init(): Promise<void> {
        // Load default animation (walk down)
        await this.loadAnimation('down')
        await this.equipmentLayer.setDirection('down')
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
            this.avatarLayer.removeChild(this.sprite)
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

        this.sprite.zIndex = 20
        this.avatarLayer.addChild(this.sprite)
        void this.equipmentLayer.setDirection(direction)

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

    async setEquipment(equipment?: PlayerEquipment): Promise<void> {
        await this.equipmentLayer.setEquipment(equipment)
    }

    destroy(): void {
        this.equipmentLayer.destroy()
        if (this.sprite) {
            this.sprite.destroy()
        }
        this.nameBgTexts.forEach((t) => t.destroy())
        this.nameText.destroy()
        this.container.destroy()
    }
}
