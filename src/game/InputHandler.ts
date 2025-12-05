type Direction = 'up' | 'down' | 'left' | 'right'

export class InputHandler {
    private keys: Set<string> = new Set()
    private directionMap: Map<string, Direction> = new Map([
        ['KeyW', 'up'],
        ['ArrowUp', 'up'],
        ['KeyS', 'down'],
        ['ArrowDown', 'down'],
        ['KeyA', 'left'],
        ['ArrowLeft', 'left'],
        ['KeyD', 'right'],
        ['ArrowRight', 'right'],
    ])
    private interactCallback: (() => void) | null = null

    constructor() {
        this.setupEventListeners()
    }

    private setupEventListeners() {
        window.addEventListener('keydown', (e) => {
            const direction = this.directionMap.get(e.code)
            if (direction) {
                e.preventDefault()
                this.keys.add(e.code)
            }

            // Handle F key for interaction
            if (e.code === 'KeyF' && this.interactCallback) {
                e.preventDefault()
                this.interactCallback()
            }
        })

        window.addEventListener('keyup', (e) => {
            const direction = this.directionMap.get(e.code)
            if (direction) {
                e.preventDefault()
                this.keys.delete(e.code)
            }
        })

        // Clear all keys when context menu appears (right-click)
        window.addEventListener('contextmenu', () => {
            this.keys.clear()
        })

        // Clear all keys when window loses focus
        window.addEventListener('blur', () => {
            this.keys.clear()
        })

        // Clear all keys when window is resized
        window.addEventListener('resize', () => {
            this.keys.clear()
        })

        // Clear all keys when page visibility changes (tab switch)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.keys.clear()
            }
        })
    }

    // Set callback for F key press
    onInteract(callback: () => void) {
        this.interactCallback = callback
    }

    getDirection(): Direction | null {
        // Priority: Up > Down > Left > Right
        // Only one direction at a time (no diagonal movement)

        // Check Up first (W or ArrowUp)
        if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) {
            return 'up'
        }

        // Check Down (S or ArrowDown)
        if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) {
            return 'down'
        }

        // Check Left (A or ArrowLeft)
        if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) {
            return 'left'
        }

        // Check Right (D or ArrowRight)
        if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) {
            return 'right'
        }

        return null
    }

    destroy() {
        // Clean up event listeners if needed
        this.keys.clear()
    }
}
