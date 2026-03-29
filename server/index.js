import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import {
  createRoom,
  joinRoom,
  getRoom,
  getRoomBySocket,
  markDisconnected,
  deleteRoom,
  startGame,
  dealAll,
  playerHit,
  playerStay,
  selectTarget,
  startNextRound,
} from './roomManager.js'

const app = express()
app.use(cors())
app.use(express.json())

const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
})

const PORT = process.env.PORT || 3001

// ─── HELPER: emit a batch of events produced by roomManager ───────────────

function emitEvents(io, room, events) {
  for (const ev of events) {
    if (ev.target === 'room') {
      io.to(room.code).emit(ev.event, ev.data)
    } else if (ev.target === 'player') {
      const player = room.players.find(p => p.id === ev.playerId)
      if (player?.socketId) {
        io.to(player.socketId).emit(ev.event, ev.data)
      }
    }
  }
}

// ─── REST health check ────────────────────────────────────────────────────

app.get('/health', (_req, res) => res.json({ ok: true }))

// ─── SOCKET HANDLERS ──────────────────────────────────────────────────────

io.on('connection', (socket) => {

  // ── Create Room ─────────────────────────────────────────────────────────
  socket.on('create_room', ({ playerName, targetScore = 200 }) => {
    const { code, player } = createRoom(socket.id, playerName, targetScore)
    socket.join(code)
    socket.emit('room_created', {
      roomCode: code,
      myPlayerId: player.id,
      players: [{ id: player.id, name: player.name }],
    })
  })

  // ── Join Room ────────────────────────────────────────────────────────────
  socket.on('join_room', ({ roomCode, playerName }) => {
    const result = joinRoom(socket.id, roomCode, playerName)
    if (result.error) {
      socket.emit('error', { message: result.error })
      return
    }
    const { room, player, rejoined } = result
    socket.join(roomCode)

    socket.emit('room_joined', {
      roomCode,
      myPlayerId: player.id,
      players: room.players.map(p => ({ id: p.id, name: p.name, connected: p.connected })),
      isHost: room.hostSocketId === socket.id,
      phase: room.phase,
    })

    // Notify others
    socket.to(roomCode).emit('player_joined', {
      players: room.players.map(p => ({ id: p.id, name: p.name, connected: p.connected })),
      newPlayerName: player.name,
      rejoined,
    })
  })

  // ── Start Game ───────────────────────────────────────────────────────────
  socket.on('start_game', ({ roomCode }) => {
    const room = getRoom(roomCode)
    if (!room) return
    if (room.hostSocketId !== socket.id) {
      socket.emit('error', { message: 'Sadece oda sahibi oyunu başlatabilir.' })
      return
    }
    if (room.players.length < 2) {
      socket.emit('error', { message: 'En az 2 oyuncu gerekli.' })
      return
    }

    startGame(room)

    // Notify everyone game is starting
    io.to(roomCode).emit('game_started', {
      allPlayers: room.players.map(p => ({ id: p.id, name: p.name, totalScore: 0, cardCount: 0 })),
      targetScore: room.targetScore,
      round: room.round,
    })

    // Deal cards
    const events = dealAll(room)
    emitEvents(io, room, events)
  })

  // ── Hit ──────────────────────────────────────────────────────────────────
  socket.on('hit', ({ roomCode }) => {
    const room = getRoom(roomCode)
    if (!room || room.phase !== 'playing') return
    const player = room.players.find(p => p.socketId === socket.id)
    if (!player) return

    const events = playerHit(room, player.id)
    emitEvents(io, room, events)
  })

  // ── Stay ─────────────────────────────────────────────────────────────────
  socket.on('stay', ({ roomCode }) => {
    const room = getRoom(roomCode)
    if (!room || room.phase !== 'playing') return
    const player = room.players.find(p => p.socketId === socket.id)
    if (!player) return

    const events = playerStay(room, player.id)
    emitEvents(io, room, events)
  })

  // ── Select Action Target ─────────────────────────────────────────────────
  socket.on('select_action_target', ({ roomCode, targetPlayerId }) => {
    const room = getRoom(roomCode)
    if (!room) return
    const player = room.players.find(p => p.socketId === socket.id)
    if (!player) return

    const events = selectTarget(room, player.id, targetPlayerId)
    emitEvents(io, room, events)
  })

  // ── Next Round ───────────────────────────────────────────────────────────
  socket.on('next_round', ({ roomCode }) => {
    const room = getRoom(roomCode)
    if (!room || room.phase !== 'roundEnd') return
    // Only host can advance
    if (room.hostSocketId !== socket.id) return

    const events = startNextRound(room)
    emitEvents(io, room, events)
  })

  // ── Disconnect ───────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const result = markDisconnected(socket.id)
    if (!result) return
    const { room, player } = result

    io.to(room.code).emit('player_disconnected', {
      playerId: player.id,
      playerName: player.name,
      players: room.players.map(p => ({ id: p.id, name: p.name, connected: p.connected })),
    })

    // Delete room if all players disconnected after a delay
    setTimeout(() => {
      const r = getRoom(room.code)
      if (r && r.players.every(p => !p.connected)) {
        deleteRoom(room.code)
      }
    }, 30 * 60 * 1000) // 30 min
  })
})

httpServer.listen(PORT, () => {
  console.log(`✅ Şans Yedi server running on port ${PORT}`)
})
