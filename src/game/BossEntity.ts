/**
 * BossEntity
 * Renders a raid boss on the game map using frames from /boss/frames/
 * Boss is displayed at full 400x400px size with idle animation
 * Interaction range is slightly larger than the visual size
 */
import * as PIXI from 'pixi.js'

export interface BossSpawnData {
    id: number
    x: number
    y: number
    name: string
    maxHp: number
    timeLimitSeconds: number
    templateId: number
}

const BOSS_FRAME_COUNT = 4
const BOSS_FRAME_PATH = '/boss/frames/boss'
const BOSS_DISPLAY_SIZE = 400 // Display at full 400x400px
const BOSS_ANIM_SPEED = 0.04 // Slow idle breathing animation
const BOSS_INTERACT_RADIUS = 220 // Slightly larger than half the boss size

export class BossEntity {
    private container: PIXI.Container
    private sprite: PIXI.AnimatedSprite | null = null
    private nameText: PIXI.Text | null = null
    private nameBgTexts: PIXI.Text[] = []
    private hpBarBg: PIXI.Graphics | null = null
    private hpBarFill: PIXI.Graphics | null = null
    private bossData: BossSpawnData
    private currentHp: number

    constructor(data: BossSpawnData) {
        this.bossData = data
        this.currentHp = data.maxHp
        this.container = new PIXI.Container()
        this.container.x = data.x
        this.container.y = data.y

        this.loadBossSprite()
        this.createNameLabel()
        this.createHpBar()
    }

    private async loadBossSprite() {
        try {
            // Load all animation frames
            const textures: PIXI.Texture[] = []
            for (let i = 1; i <= BOSS_FRAME_COUNT; i++) {
                const path = `${BOSS_FRAME_PATH}-${i.toString().padStart(3, '0')}.png`
                const texture = await PIXI.Assets.load(path)
                textures.push(texture)
            }

            // Create animated sprite
            this.sprite = new PIXI.AnimatedSprite(textures)
            this.sprite.animationSpeed = BOSS_ANIM_SPEED
            this.sprite.anchor.set(0.5, 0.5)
            this.sprite.loop = true

            // Scale to 400x400px display size
            // Determine original frame size from first texture
            const origWidth = textures[0].width
            const origHeight = textures[0].height
            const scaleX = BOSS_DISPLAY_SIZE / origWidth
            const scaleY = BOSS_DISPLAY_SIZE / origHeight
            this.sprite.scale.set(scaleX, scaleY)

            this.sprite.play()

            // Insert sprite behind name/HP bar (at index 0)
            this.container.addChildAt(this.sprite, 0)

            console.log(
                `👹 Boss "${this.bossData.name}" loaded at (${this.bossData.x}, ${this.bossData.y}) - ${origWidth}x${origHeight} → ${BOSS_DISPLAY_SIZE}px`
            )
        } catch (error) {
            console.error('Failed to load boss sprite:', error)
            this.drawFallbackBoss()
        }
    }

    private drawFallbackBoss() {
        const graphics = new PIXI.Graphics()
        const halfSize = BOSS_DISPLAY_SIZE / 2

        // Dark red circle as fallback
        graphics.circle(0, 0, halfSize * 0.8)
        graphics.fill({ color: 0x8b0000, alpha: 0.8 })
        graphics.circle(0, 0, halfSize * 0.8)
        graphics.stroke({ width: 3, color: 0xff4444 })

        // Boss icon text
        const iconStyle = new PIXI.TextStyle({ fontSize: 80, fontFamily: 'Arial' })
        const icon = new PIXI.Text('👹', iconStyle)
        icon.anchor.set(0.5, 0.5)
        icon.resolution = 2
        graphics.addChild(icon)

        this.container.addChildAt(graphics, 0)
    }

    private createNameLabel() {
        const displayName = this.bossData.name
        const yOffset = -(BOSS_DISPLAY_SIZE / 2) - 30

        // Shadow/outline copies
        const bgStyle = { fontFamily: 'Arial', fontSize: 16, fill: '#000000', fontWeight: 'bold' as const }
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
            bg.y = yOffset + oy
            bg.resolution = 2
            this.container.addChild(bg)
            this.nameBgTexts.push(bg)
        }

        // Foreground name in boss red
        const fgStyle = { fontFamily: 'Arial', fontSize: 16, fill: '#ff6666', fontWeight: 'bold' as const }
        this.nameText = new PIXI.Text(displayName, new PIXI.TextStyle(fgStyle))
        this.nameText.anchor.set(0.5, 1)
        this.nameText.y = yOffset
        this.nameText.resolution = 2
        this.container.addChild(this.nameText)
    }

    private createHpBar() {
        const barWidth = 120
        const barHeight = 8
        const yOffset = -(BOSS_DISPLAY_SIZE / 2) - 12

        // Background (dark)
        this.hpBarBg = new PIXI.Graphics()
        this.hpBarBg.roundRect(-barWidth / 2, yOffset, barWidth, barHeight, 3)
        this.hpBarBg.fill({ color: 0x1a1a1a, alpha: 0.8 })
        this.hpBarBg.roundRect(-barWidth / 2, yOffset, barWidth, barHeight, 3)
        this.hpBarBg.stroke({ width: 1, color: 0x444444 })
        this.container.addChild(this.hpBarBg)

        // Fill (red gradient effect)
        this.hpBarFill = new PIXI.Graphics()
        this.updateHpBar()
        this.container.addChild(this.hpBarFill)
    }

    private updateHpBar() {
        if (!this.hpBarFill) return

        const barWidth = 120
        const barHeight = 8
        const yOffset = -(BOSS_DISPLAY_SIZE / 2) - 12
        const hpPercent = Math.max(0, this.currentHp / this.bossData.maxHp)
        const fillWidth = barWidth * hpPercent

        this.hpBarFill.clear()
        if (fillWidth > 0) {
            // Color transitions: green > yellow > orange > red
            let color = 0x48bb78 // green
            if (hpPercent <= 0.25)
                color = 0xe53e3e // red
            else if (hpPercent <= 0.5)
                color = 0xed8936 // orange
            else if (hpPercent <= 0.75) color = 0xecc94b // yellow

            this.hpBarFill.roundRect(-barWidth / 2 + 1, yOffset + 1, fillWidth - 2, barHeight - 2, 2)
            this.hpBarFill.fill(color)
        }
    }

    /** Update boss HP and refresh the bar */
    setHp(hp: number) {
        this.currentHp = Math.max(0, Math.min(hp, this.bossData.maxHp))
        this.updateHpBar()
    }

    /** Get current HP */
    getHp(): number {
        return this.currentHp
    }

    /** Play death animation — fade out over 1.5s (similar to chest open animation) */
    async playDeathAnimation(): Promise<void> {
        try {
            // Stop animation
            if (this.sprite) {
                this.sprite.stop()
            }

            // Flash red briefly
            if (this.sprite) {
                this.sprite.tint = 0xff0000
                await new Promise((resolve) => setTimeout(resolve, 300))
                this.sprite.tint = 0xffffff
            }

            // Fade out over 1.5 seconds
            await new Promise<void>((resolve) => {
                const fadeStart = Date.now()
                const fadeDuration = 1500

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
            console.error('Failed to play boss death animation:', error)
        }
    }

    /** Get the interaction radius for this boss */
    static getInteractRadius(): number {
        return BOSS_INTERACT_RADIUS
    }

    getContainer(): PIXI.Container {
        return this.container
    }

    getId(): number {
        return this.bossData.id
    }

    getData(): BossSpawnData {
        return this.bossData
    }

    getPosition(): { x: number; y: number } {
        return { x: this.bossData.x, y: this.bossData.y }
    }

    destroy(): void {
        this.sprite?.destroy()
        this.nameText?.destroy()
        this.nameBgTexts.forEach((t) => t.destroy())
        this.hpBarBg?.destroy()
        this.hpBarFill?.destroy()
        this.container.destroy()
    }
}
