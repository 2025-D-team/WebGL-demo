import type { TiledObject } from '../types/tiled'

export interface Rectangle {
    x: number
    y: number
    width: number
    height: number
}

export class CollisionManager {
    private collisionRects: Rectangle[] = []

    /**
     * Load collision objects from Tiled Object Layer
     */
    loadFromTiledObjects(objects: TiledObject[]) {
        this.collisionRects = objects
            .filter((obj) => obj.type === 'collision' || obj.name === 'collision')
            .map((obj) => ({
                x: obj.x,
                y: obj.y,
                width: obj.width,
                height: obj.height,
            }))

        console.log(`Loaded ${this.collisionRects.length} collision objects`)
    }

    /**
     * Check if a point collides with any collision object
     */
    checkPointCollision(x: number, y: number): boolean {
        return this.collisionRects.some(
            (rect) => x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height
        )
    }

    /**
     * Check if a rectangle collides with any collision object
     */
    checkRectCollision(x: number, y: number, width: number, height: number): boolean {
        return this.collisionRects.some(
            (rect) => x < rect.x + rect.width && x + width > rect.x && y < rect.y + rect.height && y + height > rect.y
        )
    }

    /**
     * Get valid position after collision check (for character movement)
     * Returns the adjusted position if collision detected, or original position if valid
     */
    getValidPosition(
        newX: number,
        newY: number,
        oldX: number,
        oldY: number,
        entityWidth: number,
        entityHeight: number
    ): { x: number; y: number } {
        // Calculate entity bounds (centered anchor at 0.5, 0.5)
        const halfWidth = entityWidth / 2
        const halfHeight = entityHeight / 2

        const newLeft = newX - halfWidth
        const newTop = newY - halfHeight

        // Check if new position collides
        if (!this.checkRectCollision(newLeft, newTop, entityWidth, entityHeight)) {
            return { x: newX, y: newY }
        }

        // Try sliding along X axis
        const slideX = newX
        const slideY = oldY
        const slideLeft = slideX - halfWidth
        const slideTop = slideY - halfHeight

        if (!this.checkRectCollision(slideLeft, slideTop, entityWidth, entityHeight)) {
            return { x: slideX, y: slideY }
        }

        // Try sliding along Y axis
        const slideX2 = oldX
        const slideY2 = newY
        const slideLeft2 = slideX2 - halfWidth
        const slideTop2 = slideY2 - halfHeight

        if (!this.checkRectCollision(slideLeft2, slideTop2, entityWidth, entityHeight)) {
            return { x: slideX2, y: slideY2 }
        }

        // Can't move, return old position
        return { x: oldX, y: oldY }
    }

    /**
     * Get all collision rectangles (for debugging)
     */
    getCollisionRects(): Rectangle[] {
        return this.collisionRects
    }

    /**
     * Clear all collision data
     */
    clear() {
        this.collisionRects = []
    }
}
