// Tiled Map Editor JSON format types

export interface TiledMap {
    width: number
    height: number
    tilewidth: number
    tileheight: number
    layers: TiledLayer[]
    tilesets: TiledTileset[]
    infinite: boolean
    orientation: string
    renderorder: string
    version: string
    tiledversion: string
}

export interface TiledLayer {
    id: number
    name: string
    type: string
    visible: boolean
    opacity: number
    x: number
    y: number
    width: number
    height: number
    data?: number[] // For tile layers
    objects?: TiledObject[] // For object layers
}

export interface TiledTileset {
    firstgid: number
    source?: string // External tileset
    name?: string
    tilewidth?: number
    tileheight?: number
    tilecount?: number
    columns?: number
    image?: string
    imagewidth?: number
    imageheight?: number
}

export interface TiledObject {
    id: number
    name: string
    type: string
    x: number
    y: number
    width: number
    height: number
    visible: boolean
    properties?: TiledProperty[]
}

export interface TiledProperty {
    name: string
    type: string
    value: string | number | boolean | null
}
