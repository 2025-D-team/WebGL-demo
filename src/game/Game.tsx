import { useEffect, useRef } from 'react'

import * as PIXI from 'pixi.js'

import { TiledMapLoader } from './TiledMapLoader'

export const Game = () => {
    const canvasRef = useRef<HTMLDivElement>(null)
    const appRef = useRef<PIXI.Application | null>(null)

    useEffect(() => {
        const initGame = async () => {
            if (!canvasRef.current) return

            // Create PixiJS application
            const app = new PIXI.Application()
            await app.init({
                width: window.innerWidth,
                height: window.innerHeight,
                backgroundColor: 0x1a1a1a,
                antialias: true,
                resolution: window.devicePixelRatio || 1,
                autoDensity: true,
            })

            appRef.current = app
            canvasRef.current.appendChild(app.canvas)

            // Load and render map
            try {
                const mapLoader = new TiledMapLoader()
                const mapContainer = await mapLoader.loadMap('/src/assets/maps/map_demo.tmj')

                app.stage.addChild(mapContainer)

                // Get map dimensions
                const mapData = mapLoader.getMapData()
                if (mapData) {
                    const mapWidth = mapData.width * mapData.tilewidth
                    const mapHeight = mapData.height * mapData.tileheight
                    console.log(`Map size: ${mapWidth}x${mapHeight} pixels`)
                    console.log(`Grid: ${mapData.width}x${mapData.height} tiles`)

                    // Scale to fit screen initially
                    const scaleX = window.innerWidth / mapWidth
                    const scaleY = window.innerHeight / mapHeight
                    const scale = Math.min(scaleX, scaleY, 1) * 0.8

                    mapContainer.scale.set(scale)

                    // Center map
                    mapContainer.x = (window.innerWidth - mapWidth * scale) / 2
                    mapContainer.y = (window.innerHeight - mapHeight * scale) / 2
                }

                // Add simple camera controls (drag to pan, wheel to zoom)
                let isDragging = false
                let dragStart = { x: 0, y: 0 }

                app.canvas.addEventListener('mousedown', (e) => {
                    isDragging = true
                    dragStart = { x: e.clientX, y: e.clientY }
                })

                app.canvas.addEventListener('mousemove', (e) => {
                    if (!isDragging) return

                    const dx = e.clientX - dragStart.x
                    const dy = e.clientY - dragStart.y

                    mapContainer.x += dx
                    mapContainer.y += dy

                    dragStart = { x: e.clientX, y: e.clientY }
                })

                app.canvas.addEventListener('mouseup', () => {
                    isDragging = false
                })

                app.canvas.addEventListener('wheel', (e) => {
                    e.preventDefault()

                    const zoomSpeed = 0.1
                    const direction = e.deltaY > 0 ? -1 : 1
                    const newScale = mapContainer.scale.x * (1 + direction * zoomSpeed)

                    // Clamp scale
                    if (newScale >= 0.1 && newScale <= 2) {
                        mapContainer.scale.set(newScale)
                    }
                })
            } catch (error) {
                console.error('Failed to load game:', error)
            }
        }

        initGame()

        // Cleanup
        return () => {
            if (appRef.current) {
                appRef.current.destroy(true)
            }
        }
    }, [])

    return (
        <div
            ref={canvasRef}
            style={{
                width: '100%',
                height: '100vh',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'hidden',
            }}
        />
    )
}
