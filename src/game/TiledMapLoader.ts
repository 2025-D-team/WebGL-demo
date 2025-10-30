import * as PIXI from 'pixi.js'

import type { TiledMap, TiledObject } from '../types/tiled'

export class TiledMapLoader {
    private mapData: TiledMap | null = null
    private collisionObjects: TiledObject[] = []
    private container: PIXI.Container

    constructor() {
        this.container = new PIXI.Container()
    }

    async loadMap(mapPath: string): Promise<PIXI.Container> {
        try {
            // Load map JSON
            const response = await fetch(mapPath)
            this.mapData = (await response.json()) as TiledMap

            console.log('Loaded Tiled map:', this.mapData)

            // Load tileset images
            await this.loadTilesets()

            // Render tile layers
            this.renderTileLayers()

            // Load collision objects from Object Layers
            this.loadCollisionObjects()

            return this.container
        } catch (error) {
            console.error('Failed to load map:', error)
            throw error
        }
    }

    private async loadTilesets(): Promise<void> {
        if (!this.mapData) return

        for (const tileset of this.mapData.tilesets) {
            if (tileset.source) {
                // External tileset - load .tsj/.tsx file (from public/maps/)
                try {
                    const response = await fetch(`/maps/${tileset.source}`)
                    const tsxData = await response.json()

                    // Merge external tileset data
                    Object.assign(tileset, tsxData)

                    if (tileset.image) {
                        // Prepend /maps/ to the image path
                        const imagePath = `/maps/${tileset.image}`
                        tileset.image = imagePath
                        await PIXI.Assets.load(imagePath)
                    }
                } catch (error) {
                    console.warn(`Failed to load external tileset: ${tileset.source}`, error)
                    // Fallback: try to use root.png as default tileset
                    tileset.image = '/maps/root.png'
                    tileset.imagewidth = 1000
                    tileset.imageheight = 1000
                    tileset.tilewidth = 32
                    tileset.tileheight = 32
                    tileset.columns = 31
                    await PIXI.Assets.load(tileset.image)
                }
            } else if (tileset.image) {
                // Inline tileset (from public/maps/)
                const imagePath = `/maps/${tileset.image}`
                tileset.image = imagePath
                await PIXI.Assets.load(imagePath)
            }
        }
    }

    private renderTileLayers(): void {
        if (!this.mapData) return

        const { width, tilewidth, tileheight, layers, tilesets } = this.mapData

        // Process each layer
        for (const layer of layers) {
            if (layer.type !== 'tilelayer' || !layer.data) continue

            const layerContainer = new PIXI.Container()
            layerContainer.name = layer.name
            layerContainer.alpha = layer.opacity

            // Render tiles
            for (let i = 0; i < layer.data.length; i++) {
                const gid = layer.data[i]
                if (gid === 0) continue // Empty tile

                const x = (i % width) * tilewidth
                const y = Math.floor(i / width) * tileheight

                const sprite = this.createTileSprite(gid, tilesets, tilewidth, tileheight)
                if (sprite) {
                    sprite.x = x
                    sprite.y = y
                    layerContainer.addChild(sprite)
                }

                // Check if this tile has collision property
                this.checkTileCollision(gid, tilesets, x, y, tilewidth, tileheight)
            }

            this.container.addChild(layerContainer)
        }
    }

    private createTileSprite(
        gid: number,
        tilesets: TiledMap['tilesets'],
        tileWidth: number,
        tileHeight: number
    ): PIXI.Sprite | null {
        // Find the correct tileset
        let tileset = tilesets[0]
        for (const ts of tilesets) {
            if (gid >= ts.firstgid) {
                tileset = ts
            } else {
                break
            }
        }

        if (!tileset.image) return null

        // Calculate tile position in tileset
        const localId = gid - tileset.firstgid
        const columns = tileset.columns || Math.floor((tileset.imagewidth || 0) / tileWidth)

        // Handle margin and spacing
        const margin = tileset.margin || 0
        const spacing = tileset.spacing || 0

        const col = localId % columns
        const row = Math.floor(localId / columns)

        const tileX = margin + col * (tileWidth + spacing)
        const tileY = margin + row * (tileHeight + spacing)

        // Create texture from tileset
        const baseTexture = PIXI.Texture.from(tileset.image)
        const texture = new PIXI.Texture({
            source: baseTexture.source,
            frame: new PIXI.Rectangle(tileX, tileY, tileWidth, tileHeight),
        })

        return new PIXI.Sprite(texture)
    }

    private loadCollisionObjects() {
        if (!this.mapData) return

        // Find all Object Layers
        for (const layer of this.mapData.layers) {
            if (layer.type === 'objectgroup' && layer.objects) {
                // Filter collision objects (by type or name)
                const collisions = layer.objects.filter(
                    (obj) => obj.type === 'collision' || obj.name.toLowerCase().includes('collision')
                )

                this.collisionObjects.push(...collisions)
            }
        }
    }

    private checkTileCollision(
        gid: number,
        tilesets: TiledMap['tilesets'],
        x: number,
        y: number,
        tileWidth: number,
        tileHeight: number
    ) {
        // Find the tileset for this GID
        let tileset = tilesets[0]
        for (const ts of tilesets) {
            if (gid >= ts.firstgid) {
                tileset = ts
            } else {
                break
            }
        }

        if (!tileset.tiles) return

        // Get local tile ID
        const localId = gid - tileset.firstgid

        // Find tile data
        const tileData = tileset.tiles.find((t) => t.id === localId)
        if (!tileData) return

        // Check for collides property
        const collidesProperty = tileData.properties?.find((p) => p.name === 'collides' && p.value === true)

        if (collidesProperty) {
            // Create collision object for this tile
            const collisionObj: TiledObject = {
                id: this.collisionObjects.length + 1,
                name: `tile_collision_${gid}`,
                type: 'collision',
                x: x,
                y: y,
                width: tileWidth,
                height: tileHeight,
                visible: true,
            }

            this.collisionObjects.push(collisionObj)
        }

        // Also check for objectgroup (tile-level collision shapes)
        if (tileData.objectgroup?.objects) {
            for (const obj of tileData.objectgroup.objects) {
                const collisionObj: TiledObject = {
                    ...obj,
                    x: x + obj.x, // Offset by tile position
                    y: y + obj.y,
                    type: obj.type || 'collision',
                }

                this.collisionObjects.push(collisionObj)
            }
        }
    }

    getContainer(): PIXI.Container {
        return this.container
    }

    getMapData(): TiledMap | null {
        return this.mapData
    }

    getCollisionObjects(): TiledObject[] {
        return this.collisionObjects
    }
}
