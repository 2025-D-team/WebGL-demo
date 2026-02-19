import * as PIXI from 'pixi.js'

import { GameConfig } from '../../config/gameConfig'
import { EQUIPMENT_BY_ID } from './EquipmentConfig'
import { type Direction, type EquipmentSlot, type PlayerEquipment } from './types'

const SLOT_Z_INDEX: Record<EquipmentSlot, number> = {
    foot: 10,
    armor: 30,
    head: 40,
}

const SLOT_ORDER: EquipmentSlot[] = ['foot', 'armor', 'head']

const DIR_KEY_MAP: Record<Direction, 'down' | 'up' | 'right'> = {
    down: 'down',
    up: 'up',
    right: 'right',
    left: 'right',
}

const DIR_FLIP_MAP: Record<Direction, number> = {
    down: 1,
    up: 1,
    right: 1,
    left: -1,
}

export class EquipmentLayer {
    private container: PIXI.Container
    private sprites: Partial<Record<EquipmentSlot, PIXI.Sprite>> = {}
    private equipment: PlayerEquipment
    private direction: Direction = 'down'

    constructor(initialEquipment?: PlayerEquipment) {
        this.container = new PIXI.Container()
        this.container.sortableChildren = true
        this.equipment = { ...(initialEquipment || {}) }
    }

    getContainer(): PIXI.Container {
        return this.container
    }

    getEquipment(): PlayerEquipment {
        return { ...this.equipment }
    }

    async setEquipment(nextEquipment?: PlayerEquipment) {
        this.equipment = { ...(nextEquipment || {}) }
        await this.refreshSprites()
    }

    async setDirection(direction: Direction) {
        this.direction = direction
        await this.refreshSprites()
    }

    destroy() {
        for (const slot of SLOT_ORDER) {
            const sprite = this.sprites[slot]
            if (sprite) {
                this.container.removeChild(sprite)
                sprite.destroy()
            }
        }
        this.sprites = {}
        this.container.destroy()
    }

    private async refreshSprites() {
        const dirKey = DIR_KEY_MAP[this.direction]
        const flipX = DIR_FLIP_MAP[this.direction]

        for (const slot of SLOT_ORDER) {
            const itemId = this.equipment[slot]
            if (!itemId) {
                this.removeSlotSprite(slot)
                continue
            }

            const item = EQUIPMENT_BY_ID.get(itemId)
            if (!item || !item.enabled) {
                this.removeSlotSprite(slot)
                continue
            }

            try {
                const texture = await PIXI.Assets.load(item.assets[dirKey])
                const sprite = this.ensureSlotSprite(slot)

                sprite.texture = texture
                sprite.anchor.set(0.5, 0.5)
                sprite.zIndex = SLOT_Z_INDEX[slot]

                const baseSize = item.frameSizeByDirection?.[dirKey] || texture.width || 1000
                const scale = GameConfig.map.tileSize / baseSize
                sprite.scale.set(Math.abs(scale) * flipX, Math.abs(scale))
            } catch (error) {
                console.warn('Failed to load equipment texture:', { slot, itemId, direction: this.direction, error })
                this.removeSlotSprite(slot)
            }
        }

        this.container.sortChildren()
    }

    private ensureSlotSprite(slot: EquipmentSlot): PIXI.Sprite {
        let sprite = this.sprites[slot]
        if (!sprite) {
            sprite = new PIXI.Sprite()
            this.sprites[slot] = sprite
            this.container.addChild(sprite)
        }
        return sprite
    }

    private removeSlotSprite(slot: EquipmentSlot) {
        const sprite = this.sprites[slot]
        if (sprite) {
            this.container.removeChild(sprite)
            sprite.destroy()
            delete this.sprites[slot]
        }
    }
}
