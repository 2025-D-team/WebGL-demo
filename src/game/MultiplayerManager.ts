import { Socket, io } from 'socket.io-client'

import { GameConfig } from '../config/gameConfig'

export interface PlayerData {
    id: string
    x: number
    y: number
    direction: 'down' | 'up' | 'left' | 'right'
    isMoving?: boolean
}

export interface MultiplayerCallbacks {
    onPlayerJoined?: (player: PlayerData) => void
    onPlayerMoved?: (player: PlayerData) => void
    onPlayerLeft?: (playerId: string) => void
}

export class MultiplayerManager {
    private socket: Socket | null = null
    private callbacks: MultiplayerCallbacks = {}
    private connected = false
    private localPlayerId: string | null = null

    constructor(callbacks: MultiplayerCallbacks = {}) {
        this.callbacks = callbacks
    }

    connect(): void {
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
            // We send an empty object — server will apply defaults if position/name are omitted.
            try {
                this.socket!.emit('player:join', {})
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
            console.log('Player joined:', player.id)
            this.callbacks.onPlayerJoined?.(player)
        })

        this.socket.on('player:moved', (player: PlayerData) => {
            this.callbacks.onPlayerMoved?.(player)
        })

        this.socket.on('player:left', (data: { id: string }) => {
            console.log('Player left:', data.id)
            this.callbacks.onPlayerLeft?.(data.id)
        })
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
}
