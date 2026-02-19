export type EquipmentSlot = 'head' | 'armor' | 'foot'

export type Direction = 'down' | 'up' | 'left' | 'right'

export interface PlayerEquipment {
    head?: string | null
    armor?: string | null
    foot?: string | null
}

export interface CatalogEquipmentItem {
    id: string
    name: string
    slot: EquipmentSlot
    setId: string
    price: number
    enabled: boolean
    assets: {
        down: string
        up: string
        right: string
    }
    frameSizeByDirection?: {
        down?: number
        up?: number
        right?: number
    }
}
