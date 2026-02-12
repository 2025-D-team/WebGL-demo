/**
 * Boss Manager Component
 * Map editor for placing boss spawns
 * Similar flow to ChestManager: view map → click to place → fill form → save
 */
import { useCallback, useEffect, useRef, useState } from 'react'

import * as PIXI from 'pixi.js'

import { adminBossAPI } from '../../services/api'
import { TiledMapLoader } from '../TiledMapLoader'
import { BossForm, type BossFormData } from './BossForm'
import './BossManager.scss'

interface BossSpawn {
    id: number
    x: number
    y: number
    boss_template_id: number
    boss_name: string
    sprite_name?: string
    max_hp: number
    is_active: boolean
}

interface PlacingBoss {
    x: number
    y: number
}

// Boss sprite for map markers
const BOSS_SPRITE_PATH = '/boss/frames/boss-001.png'

export const BossManager = () => {
    const canvasRef = useRef<HTMLDivElement>(null)
    const appRef = useRef<PIXI.Application | null>(null)
    const mapContainerRef = useRef<PIXI.Container | null>(null)
    const mapViewRef = useRef<PIXI.Container | null>(null)

    const renderBossMarkersOnMap = useCallback(async (mapView: PIXI.Container, spawns: BossSpawn[]) => {
        // Remove existing markers
        const existing = mapView.children.filter((c) => c.label === 'boss-marker')
        existing.forEach((c) => mapView.removeChild(c))

        // Only render active spawns
        const activeSpawns = spawns.filter((s) => s.is_active)

        for (const spawn of activeSpawns) {
            try {
                const texture = await PIXI.Assets.load(BOSS_SPRITE_PATH)
                const sprite = new PIXI.Sprite(texture)
                sprite.label = 'boss-marker'
                sprite.anchor.set(0.5, 0.5)
                // Scale down from 400x400 to ~48px marker size (like chest markers)
                const markerSize = 48
                const scale = markerSize / texture.width
                sprite.scale.set(scale)
                sprite.position.set(spawn.x, spawn.y)
                mapView.addChild(sprite)
            } catch {
                // Fallback to red circle
                const fallback = new PIXI.Graphics()
                fallback.label = 'boss-marker'
                fallback.circle(0, 0, 14)
                fallback.fill({ color: 0xe53e3e, alpha: 0.9 })
                fallback.stroke({ width: 3, color: 0xffffff, alpha: 0.8 })
                fallback.position.set(spawn.x, spawn.y)
                mapView.addChild(fallback)
            }
        }
    }, [])

    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [zoom, setZoom] = useState(50)

    // Pan & Zoom state
    const isDraggingRef = useRef(false)
    const lastPositionRef = useRef({ x: 0, y: 0 })
    const zoomRef = useRef(0.5)

    // Boss placement state
    const [isPlacingMode, setIsPlacingMode] = useState(false)
    const [placingBoss, setPlacingBoss] = useState<PlacingBoss | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [savedSpawns, setSavedSpawns] = useState<BossSpawn[]>([])

    // Ref for event handler closure
    const isPlacingModeRef = useRef(false)

    useEffect(() => {
        isPlacingModeRef.current = isPlacingMode
    }, [isPlacingMode])

    useEffect(() => {
        let app: PIXI.Application | null = null
        let mounted = true

        const initMap = async () => {
            if (!canvasRef.current || !mounted) return

            try {
                app = new PIXI.Application()
                await app.init({
                    width: canvasRef.current.clientWidth,
                    height: canvasRef.current.clientHeight,
                    backgroundColor: 0x1a1a1a,
                    antialias: false,
                    resolution: 1,
                })

                if (!mounted || !canvasRef.current) {
                    app.destroy(true)
                    return
                }

                canvasRef.current.appendChild(app.canvas)
                appRef.current = app

                // Map container for pan & zoom
                const mapContainer = new PIXI.Container()
                app.stage.addChild(mapContainer)
                mapContainerRef.current = mapContainer

                mapContainer.scale.set(zoomRef.current)

                const centerX = app.canvas.width / 2
                const centerY = app.canvas.height / 2
                mapContainer.position.set(centerX, centerY)

                // Load map
                const mapLoader = new TiledMapLoader()
                const mapView = await mapLoader.loadMap('/maps/map.tmj')

                const bounds = mapView.getLocalBounds()
                mapView.pivot.set(bounds.width / 2, bounds.height / 2)

                mapContainer.addChild(mapView)
                mapViewRef.current = mapView

                setIsLoading(false)

                // Load existing boss spawns
                try {
                    const result = await adminBossAPI.getSpawns()
                    if (result.success && result.spawns.length > 0) {
                        const spawnData: BossSpawn[] = result.spawns.map((s: BossSpawn) => ({
                            id: s.id,
                            x: s.x,
                            y: s.y,
                            boss_template_id: s.boss_template_id,
                            boss_name: s.boss_name,
                            sprite_name: s.sprite_name,
                            max_hp: s.max_hp,
                            is_active: s.is_active,
                        }))
                        setSavedSpawns(spawnData)
                        await renderBossMarkersOnMap(mapView, spawnData)
                    }
                } catch (e) {
                    console.warn('Failed to load existing boss spawns:', e)
                }

                // Pan & zoom controls
                setupPanZoom(app, mapContainer)
            } catch (err) {
                console.error('Failed to load map:', err)
                setError('マップの読み込みに失敗しました')
                setIsLoading(false)
            }
        }

        const setupPanZoom = (app: PIXI.Application, container: PIXI.Container) => {
            const canvas = app.canvas

            canvas.addEventListener('mousedown', (e: MouseEvent) => {
                if (e.button === 0) {
                    if (isPlacingModeRef.current) {
                        // Place boss
                        const localX = (e.offsetX - container.position.x) / container.scale.x
                        const localY = (e.offsetY - container.position.y) / container.scale.y

                        const mapView = mapViewRef.current
                        const pivotX = mapView ? mapView.pivot.x : 0
                        const pivotY = mapView ? mapView.pivot.y : 0
                        const mapX = localX + pivotX
                        const mapY = localY + pivotY

                        setPlacingBoss({
                            x: Math.round(mapX),
                            y: Math.round(mapY),
                        })

                        setIsPlacingMode(false)
                    } else {
                        isDraggingRef.current = true
                        lastPositionRef.current = { x: e.clientX, y: e.clientY }
                        canvas.style.cursor = 'grabbing'
                    }
                }
            })

            canvas.addEventListener('mousemove', (e: MouseEvent) => {
                if (isDraggingRef.current) {
                    const dx = e.clientX - lastPositionRef.current.x
                    const dy = e.clientY - lastPositionRef.current.y
                    container.position.x += dx
                    container.position.y += dy
                    lastPositionRef.current = { x: e.clientX, y: e.clientY }
                }
            })

            const handleMouseUp = () => {
                if (isDraggingRef.current) {
                    isDraggingRef.current = false
                    canvas.style.cursor = 'grab'
                }
            }
            canvas.addEventListener('mouseup', handleMouseUp)
            canvas.addEventListener('mouseleave', handleMouseUp)

            canvas.addEventListener('mouseenter', () => {
                canvas.style.cursor = isPlacingModeRef.current ? 'crosshair' : 'grab'
            })

            canvas.addEventListener('wheel', (e: WheelEvent) => {
                e.preventDefault()
                const zoomFactor = 0.1
                const delta = e.deltaY > 0 ? -zoomFactor : zoomFactor

                let newZoom = zoomRef.current + delta
                newZoom = Math.max(0.1, Math.min(3, newZoom))

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
                setZoom(Math.round(newZoom * 100))
            })
        }

        initMap()

        return () => {
            mounted = false
            if (appRef.current) {
                appRef.current.destroy(true, { children: true })
                appRef.current = null
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Handle resize
    useEffect(() => {
        const handleResize = () => {
            if (appRef.current && canvasRef.current) {
                appRef.current.renderer.resize(canvasRef.current.clientWidth, canvasRef.current.clientHeight)
            }
        }
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    // Update cursor
    useEffect(() => {
        if (appRef.current) {
            const canvas = appRef.current.canvas
            canvas.style.cursor = isPlacingMode ? 'crosshair' : 'grab'
        }
    }, [isPlacingMode])

    const handleAddBoss = () => {
        setIsPlacingMode(true)
    }

    const handleCancelPlacing = () => {
        setIsPlacingMode(false)
    }

    const handleCloseForm = () => {
        setPlacingBoss(null)
    }

    const handleDeleteSpawn = async (spawnId: number) => {
        if (!confirm('このボススポーンを削除しますか？')) return

        try {
            const result = await adminBossAPI.deleteSpawn(spawnId)
            if (result.success) {
                setSavedSpawns((prev) => {
                    const updated = prev.filter((s) => s.id !== spawnId)
                    if (mapViewRef.current) {
                        void renderBossMarkersOnMap(mapViewRef.current, updated)
                    }
                    return updated
                })

                // Notify connected players about boss removal
                try {
                    await adminBossAPI.reloadBosses()
                    console.log('📡 Boss reload broadcast sent after delete')
                } catch (reloadErr) {
                    console.warn('Failed to reload bosses for players:', reloadErr)
                }
            }
        } catch (error) {
            console.error('Failed to delete boss spawn:', error)
            alert('ボススポーンの削除に失敗しました')
        }
    }

    const handleSaveBoss = async (data: BossFormData) => {
        setIsSaving(true)
        try {
            const result = await adminBossAPI.createSpawn({
                x: data.position.x,
                y: data.position.y,
                bossTemplateId: data.bossTemplateId,
                newBoss: data.newBoss,
            })

            if (result.success) {
                console.log('💾 Boss spawn saved:', result.spawn)
                const newSpawn: BossSpawn = {
                    id: result.spawn.id,
                    x: data.position.x,
                    y: data.position.y,
                    boss_template_id: result.spawn.boss_template_id,
                    boss_name: result.spawn.boss_name,
                    sprite_name: result.spawn.sprite_name,
                    max_hp: result.spawn.max_hp,
                    is_active: true,
                }

                setSavedSpawns((prev) => {
                    const updated = [...prev, newSpawn]
                    if (mapViewRef.current) {
                        void renderBossMarkersOnMap(mapViewRef.current, updated)
                    }
                    return updated
                })

                // Notify connected players about new boss
                try {
                    await adminBossAPI.reloadBosses()
                    console.log('📡 Boss reload broadcast sent')
                } catch (reloadErr) {
                    console.warn('Failed to reload bosses for players:', reloadErr)
                }
            }

            setPlacingBoss(null)
        } catch (error) {
            console.error('Failed to save boss spawn:', error)
            alert('ボススポーンの保存に失敗しました')
        } finally {
            setIsSaving(false)
        }
    }

    if (error) {
        return (
            <div className='boss-manager'>
                <div className='error-message'>
                    <h3>⚠️ エラー</h3>
                    <p>{error}</p>
                </div>
            </div>
        )
    }

    return (
        <div className='boss-manager'>
            {isLoading && (
                <div className='loading-overlay'>
                    <div className='loading-spinner'></div>
                    <p>マップを読み込んでいます...</p>
                </div>
            )}

            {/* Toolbar */}
            <div className='boss-toolbar'>
                <button
                    className='btn-add-boss'
                    onClick={handleAddBoss}
                    disabled={isPlacingMode}
                >
                    <span>👹</span>
                    ボスを配置
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
            </div>

            {/* Map Controls */}
            <div className='map-controls'>
                <div className='control-group'>
                    <span className='control-label'>🔍 Zoom:</span>
                    <span className='control-value'>{zoom}%</span>
                </div>
                <div className='control-group'>
                    <span className='control-label'>👹 ボス:</span>
                    <span className='control-value'>{savedSpawns.filter((s) => s.is_active).length}体</span>
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

            {/* Boss List Panel */}
            {savedSpawns.length > 0 && (
                <div className='boss-list-panel'>
                    <h3>配置済みボス</h3>
                    <ul className='boss-list'>
                        {savedSpawns.map((spawn) => (
                            <li
                                key={spawn.id}
                                className='boss-list-item'
                            >
                                <div className='boss-info'>
                                    <span className='boss-name'>{spawn.boss_name}</span>
                                    <span className='boss-pos'>
                                        ({spawn.x}, {spawn.y})
                                    </span>
                                    <span className='boss-hp'>HP: {spawn.max_hp}</span>
                                </div>
                                <button
                                    className='btn-delete-spawn'
                                    onClick={() => handleDeleteSpawn(spawn.id)}
                                    title='削除'
                                >
                                    🗑️
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div
                ref={canvasRef}
                className='map-canvas'
            />

            {/* Boss Form Modal */}
            {placingBoss && (
                <BossForm
                    position={{ x: placingBoss.x, y: placingBoss.y }}
                    onSave={handleSaveBoss}
                    onClose={handleCloseForm}
                    isSaving={isSaving}
                />
            )}
        </div>
    )
}
