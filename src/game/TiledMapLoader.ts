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
                // External tileset - load .tsj file (from public/maps/)
                try {
                    const tsxPath = tileset.source.replace(/\.tsx$/, '.json') // Try JSON version
                    const response = await fetch(`/maps/${tsxPath}`)
                    const tsxData = await response.json()

                    // Merge external tileset data
                    Object.assign(tileset, tsxData)

                    if (tileset.image) {
                        await PIXI.Assets.load(`/maps/${tileset.image}`)
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
                await PIXI.Assets.load(`/maps/${tileset.image}`)
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
        const tileX = (localId % columns) * tileWidth
        const tileY = Math.floor(localId / columns) * tileHeight

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

        console.log(`Found ${this.collisionObjects.length} collision objects`)
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
