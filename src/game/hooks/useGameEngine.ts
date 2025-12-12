import { useEffect, useRef, useState } from 'react'

import * as PIXI from 'pixi.js'

import { GameConfig } from '../../config/gameConfig'

interface UseGameEngineOptions {
    canvasRef: React.RefObject<HTMLDivElement | null>
}

interface UseGameEngineReturn {
    appRef: React.RefObject<PIXI.Application | null>
    isInitialized: boolean
}

/**
 * Hook to manage PIXI.js application lifecycle
 * Handles initialization, resize, and cleanup
 */
export const useGameEngine = ({ canvasRef }: UseGameEngineOptions): UseGameEngineReturn => {
    const appRef = useRef<PIXI.Application | null>(null)
    const [isInitialized, setIsInitialized] = useState(false)
    const [, forceUpdate] = useState(0)

    useEffect(() => {
        // Flag to prevent operations after unmount (StrictMode runs effect twice)
        let isMounted = true

        // Create PixiJS application
        const app = new PIXI.Application()

        app.init({
            width: window.innerWidth,
            height: window.innerHeight,
            backgroundColor: GameConfig.renderer.backgroundColor,
            antialias: GameConfig.renderer.antialias,
            resolution: GameConfig.renderer.resolution,
            autoDensity: GameConfig.renderer.autoDensity,
        }).then(() => {
            // Check if component was unmounted during init
            if (!isMounted || !canvasRef.current) {
                app.destroy(true, { children: true })
                return
            }

            appRef.current = app
            canvasRef.current.appendChild(app.canvas)
            setIsInitialized(true)
        })

        // Handle window resize
        const handleResize = () => {
            if (appRef.current) {
                appRef.current.renderer.resize(window.innerWidth, window.innerHeight)
                // Force re-render to update UI positions
                forceUpdate((n) => n + 1)
            }
        }
        window.addEventListener('resize', handleResize)

        // Cleanup
        return () => {
            isMounted = false
            // Remove resize listener
            window.removeEventListener('resize', handleResize)
            // Cleanup PixiJS app
            if (appRef.current) {
                appRef.current.destroy(true, { children: true })
                appRef.current = null
            }
        }
    }, [canvasRef])

    return { appRef, isInitialized }
}
