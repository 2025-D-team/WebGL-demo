/**
 * Chest Manager Component
 * Map editor for placing chests
 */
import { useCallback, useEffect, useRef, useState } from 'react'

import * as PIXI from 'pixi.js'

import { adminAPI } from '../../services/api'
import { TiledMapLoader } from '../TiledMapLoader'
import { ChestForm, type ChestFormData } from './ChestForm'
import './ChestManager.scss'

type ChestRarity = 'wood' | 'common' | 'rare' | 'legendary'

interface PlacingChest {
    rarity: ChestRarity
    x: number
    y: number
}

interface SavedChest {
    id: number
    x: number
    y: number
    rarity: string
    is_opened?: boolean
}

interface EditingChest {
    id: number
    rarity: ChestRarity
    position: { x: number; y: number }
    difficulty: string
    initialData: {
        title: string
        question: string
        hints: string[]
        expectedAnswer: string
    }
}

// Rarity sprite paths (matching ChestEntity.ts RARITY_SPRITE_MAP)
const RARITY_SPRITE: Record<string, string> = {
    wood: '/chest/wood/chest_wood.png',
    common: '/chest/common/chest_normal.png',
    rare: '/chest/rare/chest_gold.png',
    legendary: '/chest/legend/chest_rare.png',
}

export const ChestManager = () => {
    const canvasRef = useRef<HTMLDivElement>(null)
    const appRef = useRef<PIXI.Application | null>(null)
    const mapContainerRef = useRef<PIXI.Container | null>(null)
    const mapViewRef = useRef<PIXI.Container | null>(null)

    const renderChestMarkersOnMap = useCallback(async (mapView: PIXI.Container, chests: SavedChest[]) => {
        // Remove existing markers
        const existing = mapView.children.filter((c) => c.label === 'chest-marker')
        existing.forEach((c) => mapView.removeChild(c))

        // Only render unopened chests
        const unopenedChests = chests.filter((c) => !c.is_opened)

        // Load and add sprite markers
        for (const chest of unopenedChests) {
            try {
                const spritePath = RARITY_SPRITE[chest.rarity] || RARITY_SPRITE.wood
                const texture = await PIXI.Assets.load(spritePath)
                const sprite = new PIXI.Sprite(texture)
                sprite.label = 'chest-marker'
                sprite.anchor.set(0.5, 0.5)
                sprite.scale.set(1.5)
                sprite.position.set(chest.x, chest.y)
                sprite.eventMode = 'static'
                sprite.cursor = 'pointer'
                sprite.on('pointertap', () => {
                    if (isPlacingModeRef.current) return
                    setActionChest(chest)
                })
                mapView.addChild(sprite)
            } catch {
                // Fallback to simple circle if sprite fails to load
                const fallback = new PIXI.Graphics()
                fallback.label = 'chest-marker'
                fallback.circle(0, 0, 10)
                fallback.fill({ color: 0xff0000, alpha: 0.8 })
                fallback.position.set(chest.x, chest.y)
                fallback.eventMode = 'static'
                fallback.cursor = 'pointer'
                fallback.on('pointertap', () => {
                    if (isPlacingModeRef.current) return
                    setActionChest(chest)
                })
                mapView.addChild(fallback)
            }
        }
    }, [])
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
    const [isSaving, setIsSaving] = useState(false)
    const [savedChests, setSavedChests] = useState<SavedChest[]>([])
    const [actionChest, setActionChest] = useState<SavedChest | null>(null)
    const [editingChest, setEditingChest] = useState<EditingChest | null>(null)

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

                // Load existing chests from DB and render markers
                try {
                    const result = await adminAPI.getChests()
                    if (result.success && result.chests.length > 0) {
                        const chestData = result.chests.map(
                            (c: { id: number; x: number; y: number; rarity: string; is_opened?: boolean }) => ({
                                id: c.id,
                                x: c.x,
                                y: c.y,
                                rarity: c.rarity,
                                is_opened: !!c.is_opened,
                            })
                        )
                        setSavedChests(chestData)
                        await renderChestMarkersOnMap(mapView, chestData)
                    }
                } catch (e) {
                    console.warn('Failed to load existing chests:', e)
                }

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
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

    const handleOpenEditChest = async () => {
        if (!actionChest) return
        try {
            const result = await adminAPI.getChestById(actionChest.id)
            if (!result.success || !result.chest) {
                alert(result.error || '宝箱情報の取得に失敗しました')
                return
            }

            const chest = result.chest as {
                id: number
                x: number
                y: number
                rarity: string
                title?: string
                description?: string
                hints?: string[] | string
                expected_output?: string
            }

            let rawHints: string[] = []
            if (Array.isArray(chest.hints)) {
                rawHints = chest.hints
            } else if (typeof chest.hints === 'string') {
                try {
                    rawHints = JSON.parse(chest.hints || '[]')
                } catch {
                    rawHints = []
                }
            }

            const rarity = (chest.rarity as ChestRarity) || 'wood'
            setEditingChest({
                id: chest.id,
                rarity,
                position: { x: chest.x, y: chest.y },
                difficulty: rarityConfig[rarity].difficulty,
                initialData: {
                    title: chest.title || '',
                    question: chest.description || '',
                    hints: Array.isArray(rawHints) ? rawHints : [],
                    expectedAnswer: chest.expected_output || '',
                },
            })
            setActionChest(null)
        } catch (error) {
            console.error('Failed to open chest editor:', error)
            alert('宝箱情報の取得に失敗しました')
        }
    }

    const handleDeleteChest = async () => {
        if (!actionChest) return
        if (!confirm('この宝箱を削除しますか？関連する問題データも削除されます。')) return

        try {
            const result = await adminAPI.deleteChest(actionChest.id)
            if (result.success) {
                const deletedId = actionChest.id
                setSavedChests((prev) => {
                    const updated = prev.filter((c) => c.id !== deletedId)
                    if (mapViewRef.current) {
                        void renderChestMarkersOnMap(mapViewRef.current, updated)
                    }
                    return updated
                })
                setActionChest(null)
                await adminAPI.reloadChests()
            } else {
                alert(result.error || '宝箱の削除に失敗しました')
            }
        } catch (error) {
            console.error('Failed to delete chest:', error)
            alert('宝箱の削除に失敗しました')
        }
    }

    const handleResetAllChests = async () => {
        const openedCount = savedChests.filter((c) => c.is_opened).length
        if (openedCount === 0) {
            alert('リセットする宝箱がありません')
            return
        }
        if (
            !confirm(
                `開封済みの宝箱 ${openedCount}個 をリセットしますか？\nリセットするとプレイヤーが再度挑戦できるようになります。`
            )
        ) {
            return
        }

        try {
            const result = await adminAPI.resetAllChests()
            if (result.success) {
                // Reload chests into game memory
                await adminAPI.reloadChests()

                // Refresh the admin view
                const chestResult = await adminAPI.getChests()
                if (chestResult.success) {
                    const chestData = chestResult.chests.map(
                        (c: { id: number; x: number; y: number; rarity: string; is_opened?: boolean }) => ({
                            id: c.id,
                            x: c.x,
                            y: c.y,
                            rarity: c.rarity,
                            is_opened: !!c.is_opened,
                        })
                    )
                    setSavedChests(chestData)
                    if (mapViewRef.current) {
                        await renderChestMarkersOnMap(mapViewRef.current, chestData)
                    }
                }
            }
        } catch (error) {
            console.error('Failed to reset chests:', error)
            alert('宝箱のリセットに失敗しました')
        }
    }

    const handleSaveChest = async (data: ChestFormData) => {
        setIsSaving(true)
        try {
            const result = await adminAPI.createChest({
                x: data.position.x,
                y: data.position.y,
                rarity: data.rarity,
                title: data.title,
                question: data.question,
                hints: data.hints,
                expectedAnswer: data.expectedAnswer,
            })

            if (result.success) {
                console.log('💾 Chest saved:', result.chest)
                const newChest = {
                    id: result.chest.id,
                    x: data.position.x,
                    y: data.position.y,
                    rarity: data.rarity,
                }

                // Add to saved chests for map display
                setSavedChests((prev) => {
                    const updated = [...prev, newChest]
                    // Re-render markers on map
                    if (mapViewRef.current) {
                        void renderChestMarkersOnMap(mapViewRef.current, updated)
                    }
                    return updated
                })

                // Reload chests into game memory
                await adminAPI.reloadChests()
            }

            setPlacingChest(null)
        } catch (error) {
            console.error('Failed to save chest:', error)
            alert('宝箱の保存に失敗しました')
        } finally {
            setIsSaving(false)
        }
    }

    const handleUpdateChest = async (data: ChestFormData) => {
        if (!editingChest) return
        setIsSaving(true)
        try {
            const result = await adminAPI.updateChest(editingChest.id, {
                x: data.position.x,
                y: data.position.y,
                rarity: data.rarity,
                title: data.title,
                question: data.question,
                hints: data.hints,
                expectedAnswer: data.expectedAnswer,
            })

            if (result.success) {
                setSavedChests((prev) => {
                    const updated = prev.map((chest) =>
                        chest.id === editingChest.id ?
                            {
                                ...chest,
                                x: data.position.x,
                                y: data.position.y,
                                rarity: data.rarity,
                            }
                        :   chest
                    )
                    if (mapViewRef.current) {
                        void renderChestMarkersOnMap(mapViewRef.current, updated)
                    }
                    return updated
                })
                await adminAPI.reloadChests()
                setEditingChest(null)
            } else {
                alert(result.error || '宝箱の更新に失敗しました')
            }
        } catch (error) {
            console.error('Failed to update chest:', error)
            alert('宝箱の更新に失敗しました')
        } finally {
            setIsSaving(false)
        }
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

                {savedChests.some((c) => c.is_opened) && (
                    <button
                        className='btn-reset-chests'
                        onClick={handleResetAllChests}
                    >
                        <span>🔄</span>
                        開封済みリセット
                    </button>
                )}

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
                <div className='control-group'>
                    <span className='control-label'>📦 宝箱:</span>
                    <span className='control-value'>
                        {savedChests.filter((c) => !c.is_opened).length}/{savedChests.length}個
                    </span>
                </div>
                {savedChests.some((c) => c.is_opened) && (
                    <div className='control-group'>
                        <span className='control-label'>🔓 開封済み:</span>
                        <span className='control-value opened'>{savedChests.filter((c) => c.is_opened).length}個</span>
                    </div>
                )}
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

            {/* Chest Action Modal */}
            {actionChest && (
                <div className='chest-action-overlay'>
                    <div className='chest-action-modal'>
                        <h4>📦 宝箱 #{actionChest.id}</h4>
                        <p>
                            ({actionChest.x}, {actionChest.y}) / {actionChest.rarity}
                        </p>
                        <div className='chest-action-buttons'>
                            <button
                                className='btn-action-edit'
                                onClick={handleOpenEditChest}
                            >
                                ✏️ 編集
                            </button>
                            <button
                                className='btn-action-delete'
                                onClick={handleDeleteChest}
                            >
                                🗑️ 削除
                            </button>
                            <button
                                className='btn-action-cancel'
                                onClick={() => setActionChest(null)}
                            >
                                キャンセル
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Chest Form Modal */}
            {placingChest && (
                <ChestForm
                    rarity={placingChest.rarity}
                    position={{ x: placingChest.x, y: placingChest.y }}
                    difficulty={rarityConfig[placingChest.rarity].difficulty}
                    onSave={handleSaveChest}
                    onClose={handleCloseForm}
                    isSaving={isSaving}
                />
            )}

            {editingChest && (
                <ChestForm
                    mode='edit'
                    rarity={editingChest.rarity}
                    position={editingChest.position}
                    difficulty={editingChest.difficulty}
                    initialData={editingChest.initialData}
                    onSave={handleUpdateChest}
                    onClose={() => setEditingChest(null)}
                    isSaving={isSaving}
                />
            )}
        </div>
    )
}
