import * as PIXI from 'pixi.js'

export interface ChestData {
    id: string
    x: number
    y: number
    rarity?: string // 'wood', 'common', 'rare', 'legendary'
    state?: string
    solverId?: string | null
}

export class ChestEntity {
    private container: PIXI.Container
    private sprite: PIXI.Sprite | null = null
    private chestId: string
    private x: number
    private y: number
    private isOpening = false
    private rarity: string // Chest rarity from backend

    // Map backend rarity names to sprite folder & file prefix
    private static readonly RARITY_SPRITE_MAP: Record<string, { folder: string; prefix: string }> = {
        wood: { folder: 'wood', prefix: 'wood' },
        common: { folder: 'common', prefix: 'normal' },
        rare: { folder: 'rare', prefix: 'gold' },
        legendary: { folder: 'legend', prefix: 'rare' },
    }

    constructor(data: ChestData) {
        this.chestId = data.id
        this.x = data.x
        this.y = data.y
        this.rarity = data.rarity || 'wood' // Default to wood if not provided
        this.container = new PIXI.Container()
        this.container.x = data.x
        this.container.y = data.y

        // Load closed chest sprite based on rarity from backend
        this.loadClosedSprite()
    }

    private async loadClosedSprite() {
        try {
            // Get sprite folder & prefix from rarity
            const spriteInfo = ChestEntity.RARITY_SPRITE_MAP[this.rarity] || { folder: 'wood', prefix: 'wood' }

            const texture = await PIXI.Assets.load(`/chest/${spriteInfo.folder}/chest_${spriteInfo.prefix}.png`)
            this.sprite = new PIXI.Sprite(texture)
            this.sprite.anchor.set(0.5, 0.5)
            this.sprite.scale.set(1.5, 1.5) // Scale to 1.5x
            this.container.addChild(this.sprite)
        } catch (error) {
            console.error('Failed to load chest sprite:', error, 'rarity:', this.rarity)
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
            // Get sprite folder & prefix from rarity
            const spriteInfo = ChestEntity.RARITY_SPRITE_MAP[this.rarity] || { folder: 'wood', prefix: 'wood' }
            const openTexture = await PIXI.Assets.load(
                `/chest/${spriteInfo.folder}/chest_${spriteInfo.prefix}-open.png`
            )

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
