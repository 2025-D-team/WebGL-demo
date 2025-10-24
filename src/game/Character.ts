import * as PIXI from 'pixi.js'

type Direction = 'down' | 'up' | 'left' | 'right'

export class Character {
    private container: PIXI.Container
    private currentSprite: PIXI.AnimatedSprite | null = null
    private animations: Map<Direction, PIXI.AnimatedSprite> = new Map()
    private currentDirection: Direction = 'down'
    private isMoving: boolean = false
    private speed: number = 6 // pixels per frame (1.5x faster)
    public position: { x: number; y: number }

    constructor(x: number, y: number) {
        this.container = new PIXI.Container()
        this.position = { x, y }
        this.container.x = x
        this.container.y = y
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
            // Tile size is 32x32, GIF frames are 480x480, so scale = 32/480 ≈ 0.067
            const tileSize = 32
            const frameSize = 480
            const scale = tileSize / frameSize

            // Load walk-down (4 frames)
            const walkDownTextures = await loadFrames('/src/assets/char_demo/frames/walk-down', 4)
            const walkDownSprite = new PIXI.AnimatedSprite(walkDownTextures)
            walkDownSprite.animationSpeed = 0.15
            walkDownSprite.anchor.set(0.5, 0.5)
            walkDownSprite.scale.set(scale) // Scale to 32px (1 tile)
            this.animations.set('down', walkDownSprite)

            // Load walk-up (4 frames)
            const walkUpTextures = await loadFrames('/src/assets/char_demo/frames/walk-up', 4)
            const walkUpSprite = new PIXI.AnimatedSprite(walkUpTextures)
            walkUpSprite.animationSpeed = 0.15
            walkUpSprite.anchor.set(0.5, 0.5)
            walkUpSprite.scale.set(scale)
            this.animations.set('up', walkUpSprite)

            // Load walk-right (4 frames)
            const walkRightTextures = await loadFrames('/src/assets/char_demo/frames/walk-right', 4)
            const walkRightSprite = new PIXI.AnimatedSprite(walkRightTextures)
            walkRightSprite.animationSpeed = 0.15
            walkRightSprite.anchor.set(0.5, 0.5)
            walkRightSprite.scale.set(scale)
            this.animations.set('right', walkRightSprite)

            // Walk-left is flipped walk-right
            const walkLeftTextures = await loadFrames('/src/assets/char_demo/frames/walk-right', 4)
            const walkLeftSprite = new PIXI.AnimatedSprite(walkLeftTextures)
            walkLeftSprite.animationSpeed = 0.15
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

    move(direction: Direction | null, mapBounds?: { minX: number; maxX: number; minY: number; maxY: number }) {
        if (direction) {
            this.setDirection(direction, true)
            this.isMoving = true

            // Calculate new position
            let newX = this.position.x
            let newY = this.position.y

            switch (direction) {
                case 'up':
                    newY -= this.speed
                    break
                case 'down':
                    newY += this.speed
                    break
                case 'left':
                    newX -= this.speed
                    break
                case 'right':
                    newX += this.speed
                    break
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
}
