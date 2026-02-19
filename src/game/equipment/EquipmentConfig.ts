import { type CatalogEquipmentItem, type PlayerEquipment } from './types'

export const DEFAULT_EQUIPMENT: PlayerEquipment = {
    head: 'set1-head-knight',
    armor: 'set1-armor-knight',
    foot: 'set1-foot-knight',
}

export const EQUIPMENT_CATALOG: CatalogEquipmentItem[] = [
    {
        id: 'set1-head-knight',
        name: 'Knight Helm',
        slot: 'head',
        setId: 'set1',
        price: 20,
        enabled: true,
        assets: {
            down: '/item/set 1/head/h-down.png',
            up: '/item/set 1/head/h-up.png',
            right: '/item/set 1/head/h-right.png',
        },
        frameSizeByDirection: {
            down: 512,
            up: 1000,
            right: 1000,
        },
    },
    {
        id: 'set1-armor-knight',
        name: 'Knight Shoulder',
        slot: 'armor',
        setId: 'set1',
        price: 20,
        enabled: true,
        assets: {
            down: '/item/set 1/armor/a-down.png',
            up: '/item/set 1/armor/a-up.png',
            right: '/item/set 1/armor/a-right.png',
        },
        frameSizeByDirection: {
            down: 512,
            up: 1000,
            right: 1000,
        },
    },
    {
        id: 'set1-foot-knight',
        name: 'Knight Boots',
        slot: 'foot',
        setId: 'set1',
        price: 20,
        enabled: true,
        assets: {
            down: '/item/set 1/foot/f-down.png',
            up: '/item/set 1/foot/f-up.png',
            right: '/item/set 1/foot/f-right.png',
        },
        frameSizeByDirection: {
            down: 512,
            up: 1000,
            right: 1000,
        },
    },
]

export const EQUIPMENT_BY_ID = new Map(EQUIPMENT_CATALOG.map((item) => [item.id, item]))
