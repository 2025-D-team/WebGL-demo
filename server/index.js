import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const app = express()
const httpServer = createServer(app)

// Environment variables
const PORT = process.env.PORT || 6000
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173'

// CORS configuration
app.use(cors({
    origin: CLIENT_URL,
    credentials: true,
}))

// Socket.IO server with CORS
const io = new Server(httpServer, {
    cors: {
        origin: CLIENT_URL,
        methods: ['GET', 'POST'],
        credentials: true,
    },
    transports: ['websocket', 'polling'], // Allow both transports
    allowEIO3: true, // Support both Engine.IO v3 and v4
})

// In-memory storage for players (no database)
const players = new Map()

// Player data structure
class Player {
    constructor(id, data) {
        this.id = id
        this.name = data.name || `Player_${id.substring(0, 6)}`
        // Default spawn roughly near center but add a small random offset
        const defaultX = 1536
        const defaultY = 1536
        const jitter = () => Math.floor((Math.random() - 0.5) * 200) // ±100 px
        this.x = data.x !== undefined ? data.x : defaultX + jitter()
        this.y = data.y !== undefined ? data.y : defaultY + jitter()
        this.direction = data.direction || 'down'
        this.isMoving = false
        this.connectedAt = Date.now()
    }

    update(data) {
        if (data.x !== undefined) this.x = data.x
        if (data.y !== undefined) this.y = data.y
        if (data.direction !== undefined) this.direction = data.direction
        if (data.isMoving !== undefined) this.isMoving = data.isMoving
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            x: this.x,
            y: this.y,
            direction: this.direction,
            isMoving: this.isMoving,
        }
    }
}

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log(`[Socket.IO] Player connected: ${socket.id}`)

    // Handle player join
    socket.on('player:join', (data) => {
        const player = new Player(socket.id, data)
        players.set(socket.id, player)

        console.log(`[Player] ${player.name} joined at (${player.x}, ${player.y})`)

        // Send current player list to new player
        const playerList = Array.from(players.values()).map((p) => p.toJSON())
        socket.emit('game:init', {
            playerId: socket.id,
            players: playerList,
        })

        // Broadcast new player to all other clients
        socket.broadcast.emit('player:joined', player.toJSON())

        // Send player count
        io.emit('server:stats', {
            playerCount: players.size,
            timestamp: Date.now(),
        })
    })

    // Handle player movement
    socket.on('player:move', (data) => {
        const player = players.get(socket.id)
        if (!player) return

        player.update(data)

        // Broadcast movement to all other clients
        socket.broadcast.emit('player:moved', {
            id: socket.id,
            x: player.x,
            y: player.y,
            direction: player.direction,
            isMoving: player.isMoving,
        })
    })

    // Handle player disconnect
    socket.on('disconnect', () => {
        const player = players.get(socket.id)
        if (player) {
            console.log(`[Player] ${player.name} disconnected`)
            players.delete(socket.id)

            // Broadcast player left
            io.emit('player:left', {
                id: socket.id,
            })

            // Update player count
            io.emit('server:stats', {
                playerCount: players.size,
                timestamp: Date.now(),
            })
        }
    })

    // Handle ping for latency check
    socket.on('ping', (timestamp) => {
        socket.emit('pong', timestamp)
    })
})

// REST API endpoints (optional)
app.get('/', (req, res) => {
    res.json({
        name: 'WebGL Demo Server',
        status: 'running',
        players: players.size,
        uptime: process.uptime(),
    })
})

app.get('/players', (req, res) => {
    const playerList = Array.from(players.values()).map((p) => p.toJSON())
    res.json({
        count: players.size,
        players: playerList,
    })
})

// Start server
httpServer.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════╗
║  WebGL Demo - Multiplayer Server         ║
║                                          ║
║  HTTP Server: http://localhost:${PORT}     ║
║  WebSocket:   ws://localhost:${PORT}       ║
║  Client URL:  ${CLIENT_URL}                ║
║  Status:      ✅ Running                  ║
╚══════════════════════════════════════════╝
    `)
})

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('[Server] Shutting down gracefully...')
    httpServer.close(() => {
        console.log('[Server] HTTP server closed')
        process.exit(0)
    })
})

process.on('SIGINT', () => {
    console.log('\n[Server] Received SIGINT, shutting down...')
    httpServer.close(() => {
        console.log('[Server] HTTP server closed')
        process.exit(0)
    })
})
