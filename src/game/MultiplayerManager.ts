import { Socket, io } from 'socket.io-client'

import { GameConfig } from '../config/gameConfig'

export interface PlayerData {
    id: string
    name?: string
    x: number
    y: number
    direction: 'down' | 'up' | 'left' | 'right'
    isMoving?: boolean
}

export interface MultiplayerCallbacks {
    onPlayerJoined?: (player: PlayerData) => void
    onPlayerMoved?: (player: PlayerData) => void
    onPlayerLeft?: (playerId: string) => void
    onPlayerUpdated?: (player: PlayerData) => void
    onPlayerEmoji?: (data: { id: string; emoji: string; duration: number }) => void
}

export class MultiplayerManager {
    private socket: Socket | null = null
    private callbacks: MultiplayerCallbacks = {}
    private connected = false
    private localPlayerId: string | null = null

    constructor(callbacks: MultiplayerCallbacks = {}) {
        this.callbacks = callbacks
    }

    connect(name?: string): void {
        if (!GameConfig.multiplayer.enabled) {
            console.log('Multiplayer is disabled in config')
            return
        }

        const serverUrl = GameConfig.multiplayer.serverUrl
        console.log('Connecting to multiplayer server:', serverUrl)

        this.socket = io(serverUrl, {
            transports: ['polling', 'websocket'], // Try polling first, then upgrade to WebSocket
            reconnectionAttempts: GameConfig.multiplayer.reconnectAttempts,
            reconnectionDelay: GameConfig.multiplayer.reconnectDelay,
        })

        // Connection events
        this.socket.on('connect', () => {
            this.connected = true
            // socket.id can be undefined in some typings, normalize to null when absent
            this.localPlayerId = this.socket!.id ?? null
            console.log('✅ Connected to multiplayer server:', this.localPlayerId)

            // Notify server that this player has joined (server will reply with 'game:init')
            // Include name passed into connect() if provided.
            try {
                const payload: { name?: string } = {}
                if (typeof name === 'string' && name.trim().length > 0) payload.name = name.trim()
                this.socket!.emit('player:join', payload)
            } catch (err) {
                console.warn('Failed to emit player:join', err)
            }
        })

        this.socket.on('disconnect', () => {
            this.connected = false
            console.log('❌ Disconnected from multiplayer server')
        })

        this.socket.on('connect_error', (error: Error) => {
            console.error('Connection error:', error.message)
        })

        // Initialize player on server
        this.socket.on('game:init', (data: { playerId: string; players: PlayerData[] }) => {
            console.log('✅ Game initialized, received', data.players.length, 'existing players')
            // Load existing players
            data.players.forEach((player) => {
                if (player.id !== this.localPlayerId) {
                    this.callbacks.onPlayerJoined?.(player)
                }
            })
        })

        // Player events (using colon format to match server)
        this.socket.on('player:joined', (player: PlayerData) => {
            console.log('Player joined:', player.id, player.name)
            this.callbacks.onPlayerJoined?.(player)
        })

        // Handle updates to player object (name changes etc.)
        this.socket.on('player:updated', (player: PlayerData) => {
            console.log('Player updated:', player.id, player.name)
            this.callbacks.onPlayerUpdated?.(player)
        })

        this.socket.on('player:moved', (player: PlayerData) => {
            this.callbacks.onPlayerMoved?.(player)
        })

        // Player emoji events
        this.socket.on('player:emoji', (data: { id: string; emoji: string; duration: number }) => {
            this.callbacks.onPlayerEmoji?.(data)
        })

        this.socket.on('player:left', (data: { id: string }) => {
            console.log('Player left:', data.id)
            this.callbacks.onPlayerLeft?.(data.id)
        })
    }

    // Allow setting/updating the local player's name after connection
    setName(name: string): void {
        if (!name) return
        try {
            // Do NOT persist to localStorage - per-tab input only.
            if (this.connected && this.socket) {
                this.socket.emit('player:setName', name)
            }
        } catch (err) {
            console.warn('Failed to set player name', err)
        }
    }

    disconnect(): void {
        if (this.socket) {
            this.socket.disconnect()
            this.socket = null
            this.connected = false
            this.localPlayerId = null
        }
    }

    // Send local player position to server
    sendPosition(x: number, y: number, direction: 'down' | 'up' | 'left' | 'right', isMoving: boolean): void {
        if (!this.connected || !this.socket) return

        // Use colon format to match server events
        this.socket.emit('player:move', { x, y, direction, isMoving })
    }

    isConnected(): boolean {
        return this.connected
    }

    getLocalPlayerId(): string | null {
        return this.localPlayerId
    }

    // Send an emoji that should be displayed above this player's character for `duration` ms
    sendEmoji(emoji: string, duration = 2000): void {
        if (!this.connected || !this.socket) return
        try {
            this.socket.emit('player:emoji', { emoji, duration })
        } catch (err) {
            console.warn('Failed to send emoji', err)
        }
    }
}
