import * as PIXI from 'pixi.js'

export interface ChestData {
    id: string
    x: number
    y: number
}

export class ChestEntity {
    private container: PIXI.Container
    private sprite: PIXI.Sprite | null = null
    private chestId: string
    private x: number
    private y: number
    private isOpening = false
    private chestType: string // 'gold', 'wood', 'rare', or 'nomal'

    // Available chest types with their folder paths
    private static readonly CHEST_TYPES = ['gold', 'wood', 'rare', 'nomal']

    constructor(data: ChestData) {
        this.chestId = data.id
        this.x = data.x
        this.y = data.y
        this.container = new PIXI.Container()
        this.container.x = data.x
        this.container.y = data.y

        // Randomly select a chest type
        this.chestType = ChestEntity.CHEST_TYPES[Math.floor(Math.random() * ChestEntity.CHEST_TYPES.length)]

        // Load closed chest sprite
        this.loadClosedSprite()
    }

    private async loadClosedSprite() {
        try {
            const chestName = this.chestType === 'nomal' ? 'normal' : this.chestType
            const texture = await PIXI.Assets.load(`/chest/${this.chestType}/chest_${chestName}.png`)
            this.sprite = new PIXI.Sprite(texture)
            this.sprite.anchor.set(0.5, 0.5)
            this.sprite.scale.set(1.5, 1.5) // Scale to 1.5x
            this.container.addChild(this.sprite)
        } catch (error) {
            console.error('Failed to load chest sprite:', error)
            // Fallback to simple graphics
            this.drawFallbackChest()
        }
    }

    private drawFallbackChest() {
        const graphics = new PIXI.Graphics()
        graphics.rect(-12, -12, 24, 24)
        graphics.fill(0x8b4513)
        graphics.rect(-12, -12, 24, 8)
        graphics.fill(0xa0522d)
        graphics.circle(0, 0, 3)
        graphics.fill(0xffd700)
        graphics.rect(-12, -12, 24, 24)
        graphics.stroke({ width: 1, color: 0x654321 })
        this.container.addChild(graphics)
    }

    async playOpenAnimation(): Promise<void> {
        if (this.isOpening) return
        this.isOpening = true

        try {
            // Load and switch to open sprite (matching the chest type)
            const chestName = this.chestType === 'nomal' ? 'normal' : this.chestType
            const openTexture = await PIXI.Assets.load(`/chest/${this.chestType}/chest_${chestName}-open.png`)

            if (this.sprite) {
                this.sprite.texture = openTexture
            } else {
                this.sprite = new PIXI.Sprite(openTexture)
                this.sprite.anchor.set(0.5, 0.5)
                this.sprite.scale.set(1.5, 1.5) // Scale to 1.5x
                this.container.addChild(this.sprite)
            }

            // Wait 2 seconds
            await new Promise((resolve) => setTimeout(resolve, 2000))

            // Fade out over 1 second
            await new Promise<void>((resolve) => {
                const fadeStart = Date.now()
                const fadeDuration = 1000

                const fadeInterval = setInterval(() => {
                    const elapsed = Date.now() - fadeStart
                    const progress = Math.min(elapsed / fadeDuration, 1)
                    this.container.alpha = 1 - progress

                    if (progress >= 1) {
                        clearInterval(fadeInterval)
                        resolve()
                    }
                }, 16) // ~60fps
            })
        } catch (error) {
            console.error('Failed to play open animation:', error)
        }
    }

    getContainer(): PIXI.Container {
        return this.container
    }

    getId(): string {
        return this.chestId
    }

    getPosition(): { x: number; y: number } {
        return { x: this.x, y: this.y }
    }

    get isOpeningAnimation(): boolean {
        return this.isOpening
    }

    destroy(): void {
        this.sprite?.destroy()
        this.container.destroy()
    }
}
