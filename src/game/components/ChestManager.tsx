/**
 * Chest Manager Component
 * Map editor for placing chests
 */
import { useEffect, useRef, useState } from 'react'

import * as PIXI from 'pixi.js'

import { TiledMapLoader } from '../TiledMapLoader'
import { ChestForm, type ChestFormData } from './ChestForm'
import './ChestManager.scss'

type ChestRarity = 'wood' | 'common' | 'rare' | 'legendary'

interface PlacingChest {
    rarity: ChestRarity
    x: number
    y: number
}

export const ChestManager = () => {
    const canvasRef = useRef<HTMLDivElement>(null)
    const appRef = useRef<PIXI.Application | null>(null)
    const mapContainerRef = useRef<PIXI.Container | null>(null)
    const mapViewRef = useRef<PIXI.Container | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [zoom, setZoom] = useState(50) // Display zoom percentage

    // Pan & Zoom state
    const isDraggingRef = useRef(false)
    const lastPositionRef = useRef({ x: 0, y: 0 })
    const zoomRef = useRef(0.5) // Actual zoom value

    // Chest placement state
    const [isPlacingMode, setIsPlacingMode] = useState(false)
    const [selectedRarity, setSelectedRarity] = useState<ChestRarity | null>(null)
    const [showRarityDropdown, setShowRarityDropdown] = useState(false)
    const [placingChest, setPlacingChest] = useState<PlacingChest | null>(null)

    // Refs for event handler closure access
    const isPlacingModeRef = useRef(false)
    const selectedRarityRef = useRef<ChestRarity | null>(null)

    // Sync refs with state
    useEffect(() => {
        isPlacingModeRef.current = isPlacingMode
    }, [isPlacingMode])
    useEffect(() => {
        selectedRarityRef.current = selectedRarity
    }, [selectedRarity])

    // Rarity configuration
    const rarityConfig: Record<ChestRarity, { label: string; difficulty: string; image: string }> = {
        wood: {
            label: '木材',
            difficulty: '初級 (Easy)',
            image: '/chest/wood/chest_wood.png',
        },
        common: {
            label: '普通',
            difficulty: '中級 (Medium)',
            image: '/chest/common/chest_normal.png',
        },
        rare: {
            label: 'レア',
            difficulty: '上級 (Hard)',
            image: '/chest/rare/chest_gold.png',
        },
        legendary: {
            label: '伝説',
            difficulty: '超上級 (Expert)',
            image: '/chest/legend/chest_rare.png',
        },
    }

    useEffect(() => {
        let app: PIXI.Application | null = null
        let mounted = true

        const initMap = async () => {
            if (!canvasRef.current || !mounted) return

            try {
                // Create Pixi Application
                app = new PIXI.Application()
                await app.init({
                    width: canvasRef.current.clientWidth,
                    height: canvasRef.current.clientHeight,
                    backgroundColor: 0x1a1a1a,
                    antialias: false,
                    resolution: 1,
                })

                // Check if still mounted after async init
                if (!mounted || !canvasRef.current) {
                    app.destroy(true)
                    return
                }

                canvasRef.current.appendChild(app.canvas)
                appRef.current = app

                // Create map container for pan & zoom
                const mapContainer = new PIXI.Container()
                app.stage.addChild(mapContainer)
                mapContainerRef.current = mapContainer

                // Set initial zoom
                mapContainer.scale.set(zoomRef.current)

                // Center the map initially
                const centerX = app.canvas.width / 2
                const centerY = app.canvas.height / 2
                mapContainer.position.set(centerX, centerY)

                // Load the map
                const mapLoader = new TiledMapLoader()
                const mapView = await mapLoader.loadMap('/maps/map.tmj')

                // Center map content
                const bounds = mapView.getLocalBounds()
                mapView.pivot.set(bounds.width / 2, bounds.height / 2)

                mapContainer.addChild(mapView)
                mapViewRef.current = mapView

                setIsLoading(false)

                // Add pan & zoom controls
                setupPanZoom(app, mapContainer)
            } catch (err) {
                console.error('Failed to load map:', err)
                setError('マップの読み込みに失敗しました')
                setIsLoading(false)
            }
        }

        const setupPanZoom = (app: PIXI.Application, container: PIXI.Container) => {
            const canvas = app.canvas

            // Mouse down - start drag or place chest
            canvas.addEventListener('mousedown', (e: MouseEvent) => {
                if (e.button === 0) {
                    // Left click
                    if (isPlacingModeRef.current && selectedRarityRef.current) {
                        // Placing mode - convert screen coords to absolute map coords
                        // Step 1: Screen → container local coords (undo pan & zoom)
                        const localX = (e.offsetX - container.position.x) / container.scale.x
                        const localY = (e.offsetY - container.position.y) / container.scale.y

                        // Step 2: Add mapView pivot to convert to absolute map coords (0,0 = top-left)
                        const mapView = mapViewRef.current
                        const pivotX = mapView ? mapView.pivot.x : 0
                        const pivotY = mapView ? mapView.pivot.y : 0
                        const mapX = localX + pivotX
                        const mapY = localY + pivotY

                        setPlacingChest({
                            rarity: selectedRarityRef.current,
                            x: Math.round(mapX),
                            y: Math.round(mapY),
                        })

                        // Reset placing mode
                        setIsPlacingMode(false)
                        setSelectedRarity(null)
                    } else {
                        // Drag mode
                        isDraggingRef.current = true
                        lastPositionRef.current = { x: e.clientX, y: e.clientY }
                        canvas.style.cursor = 'grabbing'
                    }
                }
            })

            // Mouse move - pan
            canvas.addEventListener('mousemove', (e: MouseEvent) => {
                if (isDraggingRef.current) {
                    const dx = e.clientX - lastPositionRef.current.x
                    const dy = e.clientY - lastPositionRef.current.y

                    container.position.x += dx
                    container.position.y += dy

                    lastPositionRef.current = { x: e.clientX, y: e.clientY }
                }
            })

            // Mouse up - end drag
            const handleMouseUp = () => {
                if (isDraggingRef.current) {
                    isDraggingRef.current = false
                    canvas.style.cursor = 'grab'
                }
            }
            canvas.addEventListener('mouseup', handleMouseUp)
            canvas.addEventListener('mouseleave', handleMouseUp)

            // Mouse enter - show grab cursor
            canvas.addEventListener('mouseenter', () => {
                canvas.style.cursor = isPlacingModeRef.current ? 'crosshair' : 'grab'
            })

            // Wheel - zoom
            canvas.addEventListener('wheel', (e: WheelEvent) => {
                e.preventDefault()

                const zoomFactor = 0.1
                const delta = e.deltaY > 0 ? -zoomFactor : zoomFactor

                // Calculate new zoom
                let newZoom = zoomRef.current + delta
                newZoom = Math.max(0.1, Math.min(3, newZoom)) // Clamp between 10% - 300%

                // Zoom toward mouse position
                const mouseX = e.offsetX
                const mouseY = e.offsetY

                const worldPos = {
                    x: (mouseX - container.position.x) / container.scale.x,
                    y: (mouseY - container.position.y) / container.scale.y,
                }

                container.scale.set(newZoom)

                container.position.x = mouseX - worldPos.x * newZoom
                container.position.y = mouseY - worldPos.y * newZoom

                zoomRef.current = newZoom
                setZoom(Math.round(newZoom * 100)) // Update display
            })
        }

        initMap()

        // Cleanup
        return () => {
            mounted = false
            if (appRef.current) {
                appRef.current.destroy(true, { children: true })
                appRef.current = null
            }
        }
    }, [])

    // Handle window resize
    useEffect(() => {
        const handleResize = () => {
            if (appRef.current && canvasRef.current) {
                appRef.current.renderer.resize(canvasRef.current.clientWidth, canvasRef.current.clientHeight)
            }
        }

        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    // Update cursor when placing mode changes
    useEffect(() => {
        if (appRef.current && canvasRef.current) {
            const canvas = appRef.current.canvas
            canvas.style.cursor = isPlacingMode ? 'crosshair' : 'grab'
        }
    }, [isPlacingMode])

    const handleAddChest = () => {
        setShowRarityDropdown(!showRarityDropdown)
    }

    const handleSelectRarity = (rarity: ChestRarity) => {
        setSelectedRarity(rarity)
        setIsPlacingMode(true)
        setShowRarityDropdown(false)
    }

    const handleCancelPlacing = () => {
        setIsPlacingMode(false)
        setSelectedRarity(null)
    }

    const handleCloseForm = () => {
        setPlacingChest(null)
    }

    const handleSaveChest = (data: ChestFormData) => {
        console.log('💾 Save chest:', data)
        // TODO: Call API to save chest
        setPlacingChest(null)
    }

    if (error) {
        return (
            <div className='chest-manager'>
                <div className='error-message'>
                    <h3>⚠️ エラー</h3>
                    <p>{error}</p>
                </div>
            </div>
        )
    }

    return (
        <div className='chest-manager'>
            {isLoading && (
                <div className='loading-overlay'>
                    <div className='loading-spinner'></div>
                    <p>マップを読み込んでいます...</p>
                </div>
            )}

            {/* Toolbar */}
            <div className='chest-toolbar'>
                <button
                    className='btn-add-chest'
                    onClick={handleAddChest}
                    disabled={isPlacingMode}
                >
                    <span>📦</span>
                    宝箱を追加
                </button>

                {isPlacingMode && (
                    <button
                        className='btn-cancel'
                        onClick={handleCancelPlacing}
                    >
                        <span>✖️</span>
                        キャンセル
                    </button>
                )}

                {showRarityDropdown && (
                    <div className='rarity-dropdown'>
                        {(Object.keys(rarityConfig) as ChestRarity[]).map((rarity) => (
                            <button
                                key={rarity}
                                className='rarity-option'
                                onClick={() => handleSelectRarity(rarity)}
                            >
                                <img
                                    src={rarityConfig[rarity].image}
                                    alt={rarityConfig[rarity].label}
                                />
                                <div className='rarity-info'>
                                    <span className='rarity-label'>{rarityConfig[rarity].label}</span>
                                    <span className='rarity-difficulty'>{rarityConfig[rarity].difficulty}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Map Controls */}
            <div className='map-controls'>
                <div className='control-group'>
                    <span className='control-label'>🔍 Zoom:</span>
                    <span className='control-value'>{zoom}%</span>
                </div>
                {isPlacingMode && (
                    <div className='placing-hint'>
                        <span>📍</span>
                        マップをクリックして配置
                    </div>
                )}
                <div className='control-hint'>
                    {isPlacingMode ? '📍 クリックで配置' : '🖱️ ドラッグして移動 | スクロールでズーム'}
                </div>
            </div>

            <div
                ref={canvasRef}
                className='map-canvas'
            />

            {/* Chest Form Modal */}
            {placingChest && (
                <ChestForm
                    rarity={placingChest.rarity}
                    position={{ x: placingChest.x, y: placingChest.y }}
                    difficulty={rarityConfig[placingChest.rarity].difficulty}
                    onSave={handleSaveChest}
                    onClose={handleCloseForm}
                />
            )}
        </div>
    )
}
