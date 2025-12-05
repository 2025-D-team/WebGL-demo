import * as PIXI from 'pixi.js'

/**
 * Loading indicator with 3 bouncing dots
 * Reusable component for showing player is busy (solving questions, editing profile, etc.)
 */
export class LoadingIndicator {
    private container: PIXI.Container
    private dots: PIXI.Graphics[] = []
    private animationFrame: number | null = null
    private startTime: number = 0
    private isAnimating: boolean = false

    // Configuration
    private readonly dotCount = 3
    private readonly dotRadius = 4
    private readonly dotSpacing = 12
    private readonly bounceHeight = 8
    private readonly bounceSpeed = 0.8
    private readonly dotColor = 0xffffff
    private readonly shadowColor = 0x000000

    constructor() {
        this.container = new PIXI.Container()
        this.container.visible = false
        this.createDots()
    }

    private createDots(): void {
        const totalWidth = (this.dotCount - 1) * this.dotSpacing
        const startX = -totalWidth / 2

        for (let i = 0; i < this.dotCount; i++) {
            // Shadow dot
            const shadow = new PIXI.Graphics()
            shadow.circle(0, 0, this.dotRadius)
            shadow.fill({ color: this.shadowColor, alpha: 0.3 })
            shadow.position.set(startX + i * this.dotSpacing + 2, 2)
            this.container.addChild(shadow)

            // Main dot
            const dot = new PIXI.Graphics()
            dot.circle(0, 0, this.dotRadius)
            dot.fill({ color: this.dotColor })
            dot.position.set(startX + i * this.dotSpacing, 0)
            this.container.addChild(dot)
            this.dots.push(dot)
        }
    }

    private animate = (): void => {
        if (!this.isAnimating) return

        const elapsed = (performance.now() - this.startTime) / 1000

        for (let i = 0; i < this.dots.length; i++) {
            // Phase offset for each dot (creates wave effect)
            const phase = elapsed * this.bounceSpeed * Math.PI * 2 - (i * Math.PI) / 3
            const bounce = Math.abs(Math.sin(phase)) * this.bounceHeight
            this.dots[i].position.y = -bounce
        }

        this.animationFrame = requestAnimationFrame(this.animate)
    }

    show(): void {
        if (this.isAnimating) return

        this.container.visible = true
        this.isAnimating = true
        this.startTime = performance.now()
        this.animate()
    }

    hide(): void {
        this.container.visible = false
        this.isAnimating = false

        if (this.animationFrame !== null) {
            cancelAnimationFrame(this.animationFrame)
            this.animationFrame = null
        }

        // Reset dot positions
        for (const dot of this.dots) {
            dot.position.y = 0
        }
    }

    getContainer(): PIXI.Container {
        return this.container
    }

    setPosition(x: number, y: number): void {
        this.container.position.set(x, y)
    }

    destroy(): void {
        this.hide()
        this.container.destroy({ children: true })
    }
}
