import * as PIXI from 'pixi.js'

import { GameConfig } from '../config/gameConfig'

type Direction = 'down' | 'up' | 'left' | 'right'

export class Character {
    private container: PIXI.Container
    private currentSprite: PIXI.AnimatedSprite | null = null
    private animations: Map<Direction, PIXI.AnimatedSprite> = new Map()
    private currentDirection: Direction = 'down'
    private isMoving: boolean = false
    private speed: number = GameConfig.character.speed
    public position: { x: number; y: number }
    private width: number = GameConfig.character.size
    private height: number = GameConfig.character.size

    private nameText: PIXI.Text | null = null
    private nameBgTexts: PIXI.Text[] = []

    constructor(x: number, y: number, name?: string) {
        this.container = new PIXI.Container()
        this.position = { x, y }
        this.container.x = x
        this.container.y = y

        if (name !== undefined) {
            const display = name && name.trim().length > 0 ? name.trim() : ''
            const fgStyle = { fontFamily: 'Arial', fontSize: 13, fill: '#ffffff' }
            const bgStyle = { fontFamily: 'Arial', fontSize: 13, fill: '#000000' }

            const offsets: [number, number][] = [
                [-1, 0],
                [1, 0],
                [0, -1],
                [0, 1],
            ]

            for (const [ox, oy] of offsets) {
                const bg = new PIXI.Text(display, new PIXI.TextStyle(bgStyle))
                bg.anchor.set(0.5, 1)
                bg.x = ox
                bg.y = -GameConfig.character.size - 5 + oy
                bg.resolution = 2
                this.container.addChild(bg)
                this.nameBgTexts.push(bg)
            }

            this.nameText = new PIXI.Text(display, new PIXI.TextStyle(fgStyle))
            this.nameText.anchor.set(0.5, 1)
            this.nameText.y = -GameConfig.character.size - 5
            this.nameText.resolution = 2
            this.container.addChild(this.nameText)
        }
    }

    setName(name: string) {
        if (!this.nameText) return
        const display = name && name.trim().length > 0 ? name.trim() : ''
        this.nameText.text = display
        this.nameBgTexts.forEach((t: PIXI.Text) => (t.text = display))
    }

    async init() {
        // Load GIF animations
        await this.loadAnimations()

        // Set initial sprite (walkdown frame 0 as idle)
        this.setDirection('down', false)
    }

    private async loadAnimations() {
        // Load frames for each animation direction
        const loadFrames = async (basePath: string, frameCount: number): Promise<PIXI.Texture[]> => {
            const textures: PIXI.Texture[] = []
            for (let i = 1; i <= frameCount; i++) {
                const path = `${basePath}-${i.toString().padStart(3, '0')}.png`
                const texture = await PIXI.Assets.load(path)
                textures.push(texture)
            }
            return textures
        }

        try {
            // Get config values
            const tileSize = GameConfig.map.tileSize
            const frameSize = 480 // Original GIF frame size
            const scale = tileSize / frameSize
            const animSpeed = GameConfig.character.animationSpeed

            // Animation frame counts from config
            const frameCount = {
                down: GameConfig.animations.walkDown,
                up: GameConfig.animations.walkUp,
                right: GameConfig.animations.walkRight,
            }

            // Load walk-down (4 frames)
            const walkDownTextures = await loadFrames(`${GameConfig.assets.characterFrames}/walk-down`, frameCount.down)
            const walkDownSprite = new PIXI.AnimatedSprite(walkDownTextures)
            walkDownSprite.animationSpeed = animSpeed
            walkDownSprite.anchor.set(0.5, 0.5)
            walkDownSprite.scale.set(scale)
            this.animations.set('down', walkDownSprite)

            // Load walk-up (4 frames)
            const walkUpTextures = await loadFrames(`${GameConfig.assets.characterFrames}/walk-up`, frameCount.up)
            const walkUpSprite = new PIXI.AnimatedSprite(walkUpTextures)
            walkUpSprite.animationSpeed = animSpeed
            walkUpSprite.anchor.set(0.5, 0.5)
            walkUpSprite.scale.set(scale)
            this.animations.set('up', walkUpSprite)

            // Load walk-right (4 frames)
            const walkRightTextures = await loadFrames(
                `${GameConfig.assets.characterFrames}/walk-right`,
                frameCount.right
            )
            const walkRightSprite = new PIXI.AnimatedSprite(walkRightTextures)
            walkRightSprite.animationSpeed = animSpeed
            walkRightSprite.anchor.set(0.5, 0.5)
            walkRightSprite.scale.set(scale)
            this.animations.set('right', walkRightSprite)

            // Walk-left is flipped walk-right
            const walkLeftTextures = await loadFrames(
                `${GameConfig.assets.characterFrames}/walk-right`,
                frameCount.right
            )
            const walkLeftSprite = new PIXI.AnimatedSprite(walkLeftTextures)
            walkLeftSprite.animationSpeed = animSpeed
            walkLeftSprite.anchor.set(0.5, 0.5)
            walkLeftSprite.scale.set(-scale, scale) // Flip horizontally
            this.animations.set('left', walkLeftSprite)

            console.log('Character animations loaded successfully!')
        } catch (error) {
            console.error('Failed to load character animations:', error)
            throw error
        }
    }

    private setDirection(direction: Direction, moving: boolean) {
        this.currentDirection = direction
        this.isMoving = moving

        // Remove current sprite
        if (this.currentSprite) {
            this.container.removeChild(this.currentSprite)
            this.currentSprite.stop()
        }

        // Add new sprite
        const sprite = this.animations.get(direction)
        if (sprite) {
            this.currentSprite = sprite
            this.container.addChild(sprite)

            if (moving) {
                sprite.play()
            } else {
                // Set to frame 0 (idle)
                sprite.gotoAndStop(0)
            }
        }
    }

    move(
        direction: Direction | null,
        deltaTime: number, // Time elapsed since last frame (in seconds)
        mapBounds?: { minX: number; maxX: number; minY: number; maxY: number },
        collisionCheck?: (newX: number, newY: number, oldX: number, oldY: number) => { x: number; y: number }
    ) {
        if (direction) {
            this.setDirection(direction, true)
            this.isMoving = true

            // Calculate movement distance based on delta time (framerate independent)
            const moveDistance = this.speed * deltaTime

            // Calculate new position
            let newX = this.position.x
            let newY = this.position.y

            switch (direction) {
                case 'up':
                    newY -= moveDistance
                    break
                case 'down':
                    newY += moveDistance
                    break
                case 'left':
                    newX -= moveDistance
                    break
                case 'right':
                    newX += moveDistance
                    break
            }

            // Check collision if callback provided
            if (collisionCheck) {
                const validPos = collisionCheck(newX, newY, this.position.x, this.position.y)
                newX = validPos.x
                newY = validPos.y
            }

            // Clamp position within map bounds (with padding)
            if (mapBounds) {
                newX = Math.max(mapBounds.minX, Math.min(newX, mapBounds.maxX))
                newY = Math.max(mapBounds.minY, Math.min(newY, mapBounds.maxY))
            }

            this.position.x = newX
            this.position.y = newY
            this.container.x = this.position.x
            this.container.y = this.position.y
        } else {
            // Stop moving - set to idle (frame 0 of last direction)
            if (this.isMoving) {
                this.setDirection(this.currentDirection, false)
                this.isMoving = false
            }
        }
    }

    update() {
        // Animation update is handled automatically by PixiJS
    }

    getContainer(): PIXI.Container {
        return this.container
    }

    getPosition(): { x: number; y: number } {
        return this.position
    }

    getSize(): { width: number; height: number } {
        return { width: this.width, height: this.height }
    }

    getCurrentDirection(): Direction {
        return this.currentDirection
    }
}
