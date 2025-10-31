# WebGL Demo - Multiplayer Server

Simple WebSocket server for multiplayer game using Express + Socket.IO.

## Features

- ✅ Real-time player synchronization
- ✅ In-memory player storage (no database)
- ✅ Auto cleanup on disconnect
- ✅ CORS enabled for Vite dev server
- ✅ Ping/pong for latency check
- ✅ REST API for server stats

## Installation

```bash
cd server
npm install
```

## Running

### Development (with auto-reload)
```bash
npm run dev
```

### Production
```bash
npm start
```

Server will run on `http://localhost:3000`

## WebSocket Events

### Client → Server

| Event | Data | Description |
|-------|------|-------------|
| `player:join` | `{ name?, x?, y?, direction? }` | Player joins the game |
| `player:move` | `{ x, y, direction, isMoving }` | Player movement update |
| `ping` | `timestamp` | Latency check |

### Server → Client

| Event | Data | Description |
|-------|------|-------------|
| `game:init` | `{ playerId, players[] }` | Initial game state for new player |
| `player:joined` | `{ id, name, x, y, direction }` | New player joined |
| `player:moved` | `{ id, x, y, direction, isMoving }` | Player movement |
| `player:left` | `{ id }` | Player disconnected |
| `server:stats` | `{ playerCount, timestamp }` | Server statistics |
| `pong` | `timestamp` | Latency response |

## REST API Endpoints

### `GET /`
Server status and info
```json
{
  "name": "WebGL Demo Server",
  "status": "running",
  "players": 0,
  "uptime": 123.45
}
```

### `GET /players`
List all connected players
```json
{
  "count": 2,
  "players": [
    {
      "id": "abc123",
      "name": "Player_abc123",
      "x": 1536,
      "y": 1536,
      "direction": "down",
      "isMoving": false
    }
  ]
}
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |

## Architecture

- **Express** - HTTP server
- **Socket.IO** - WebSocket communication
- **CORS** - Cross-origin resource sharing
- **In-memory Map** - Player storage (data lost on restart)

## Notes

- No database - all data in RAM
- Players auto-removed on disconnect
- Default spawn: (1536, 1536) - center of map
- CORS configured for `http://localhost:5173` (Vite)
