/**
 * Game Configuration
 * Centralized configuration for all game constants
 * Easy to modify for balancing and testing
 */

export const GameConfig = {
    // Character Settings
    character: {
        speed: 200, // pixels per second (framerate independent)
        size: 32, // character hitbox size (matches tile size)
        animationSpeed: 0.15, // animation playback speed
    },

    // Map Settings
    map: {
        tileSize: 32, // size of each tile in pixels
        padding: 32, // padding from map edges (prevents character from going outside)
    },

    // Camera Settings
    camera: {
        deadzoneWidthPercent: 0.35, // 35% of screen width
        deadzoneHeightPercent: 0.4, // 40% of screen height
    },

    // Rendering Settings
    renderer: {
        backgroundColor: 0x1a1a1a, // dark gray background
        antialias: false, // pixel-perfect rendering
        resolution: 1, // 1:1 pixel ratio
        autoDensity: false, // no auto DPI scaling
    },

    // Input Settings
    input: {
        // Priority order for diagonal prevention: Up > Down > Left > Right
        movementPriority: ['up', 'down', 'left', 'right'] as const,
    },

    // Asset Paths
    assets: {
        characterFrames: '/src/assets/char_demo/frames',
        maps: '/src/assets/maps',
    },

    // Animation Frame Counts
    animations: {
        walkDown: 4,
        walkUp: 4,
        walkRight: 4,
        // walkLeft uses walkRight flipped
    },

    // Performance Settings
    performance: {
        targetFPS: 60, // target framerate (for reference)
        useVSync: true, // use browser's requestAnimationFrame
    },

    // Collision Settings
    collision: {
        enabled: true, // enable/disable collision system
        debugDraw: false, // draw collision rectangles for debugging
    },

    // Multiplayer Settings (future use)
    multiplayer: {
        enabled: false,
        serverUrl: 'ws://localhost:3000',
        reconnectAttempts: 3,
        reconnectDelay: 1000, // ms
    },
} as const

// Type-safe helper to get config values
export type CharacterConfig = typeof GameConfig.character
export type MapConfig = typeof GameConfig.map
export type CameraConfig = typeof GameConfig.camera
