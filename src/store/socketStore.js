import { create } from 'zustand'
import { socket } from '../socket.js'

const INITIAL = {
  // Connection
  connected: false,

  // Room / lobby
  roomCode: null,
  myPlayerId: null,
  myName: '',
  isHost: false,
  lobbyPlayers: [],   // [{id, name, connected}]

  // Game phase: 'home' | 'lobby' | 'playing' | 'roundEnd' | 'gameEnd'
  phase: 'home',

  // My cards (full detail)
  myHand: [],

  // All players public state
  allPlayers: [],   // [{id, name, totalScore, roundScore, cardCount, frozen, stayed, busted, connected}]

  currentPlayerId: null,
  targetScore: 200,
  deckCount: 0,
  round: 1,
  log: '',

  // Action required (for the player who drew the action card)
  pendingAction: null,   // { actionType, fromPlayerId, eligibleTargets }

  // Overlays
  showOverlay: null,    // null | 'bust' | 'flip7' | 'roundEnd' | 'secondChance'
  overlayData: null,

  // Toasts
  toasts: [],

  // Error
  error: null,

  // Round summary
  roundScores: [],
}

let toastId = 0

function addToast(set, get, message, type = 'info', duration = 3000) {
  const id = ++toastId
  set(s => ({ toasts: [...s.toasts, { id, message, type }] }))
  setTimeout(() => {
    set(s => ({ toasts: s.toasts.filter(t => t.id !== id) }))
  }, duration)
}

export const useSocketStore = create((set, get) => {
  // ── Bind socket events once ────────────────────────────────────────────

  socket.on('connect', () => set({ connected: true, error: null }))
  socket.on('disconnect', () => set({ connected: false }))
  socket.on('connect_error', () => set({ error: 'Sunucuya bağlanılamadı.' }))

  socket.on('room_created', ({ roomCode, myPlayerId, players }) => {
    set({
      roomCode, myPlayerId, isHost: true,
      lobbyPlayers: players,
      phase: 'lobby',
    })
  })

  socket.on('room_joined', ({ roomCode, myPlayerId, players, isHost, phase }) => {
    set({
      roomCode, myPlayerId, isHost,
      lobbyPlayers: players,
      phase: phase === 'lobby' ? 'lobby' : phase,
    })
  })

  socket.on('player_joined', ({ players, newPlayerName, rejoined }) => {
    set({ lobbyPlayers: players })
    addToast(set, get, `${newPlayerName} ${rejoined ? 'geri döndü' : 'katıldı'}! 👋`, 'info')
  })

  socket.on('player_disconnected', ({ playerName, players }) => {
    set({ lobbyPlayers: players })
    // Update allPlayers connected status too
    set(s => ({
      allPlayers: s.allPlayers.map(p => {
        const lp = players.find(lp => lp.id === p.id)
        return lp ? { ...p, connected: lp.connected } : p
      }),
    }))
    addToast(set, get, `${playerName} bağlantısı kesildi.`, 'warning')
  })

  socket.on('error', ({ message }) => {
    set({ error: message })
    addToast(set, get, message, 'error')
  })

  socket.on('game_started', ({ allPlayers, targetScore, round }) => {
    set({
      phase: 'playing',
      allPlayers: allPlayers.map(p => ({ ...p, cardCount: 0 })),
      myHand: [],
      targetScore,
      round,
      currentPlayerId: null,
      log: 'Kartlar dağıtılıyor...',
      pendingAction: null,
      showOverlay: null,
      roundScores: [],
    })
  })

  socket.on('round_started', ({ round, allPlayers }) => {
    set({
      round,
      allPlayers,
      myHand: [],
      phase: 'playing',
      currentPlayerId: null,
      log: 'Kartlar dağıtılıyor...',
      pendingAction: null,
      showOverlay: null,
      roundScores: [],
    })
  })

  // My private card
  socket.on('your_card', ({ card, source, busted }) => {
    set(s => ({ myHand: [...s.myHand, card] }))
    if (busted) {
      set({ showOverlay: 'bust', overlayData: { source } })
    }
  })

  socket.on('second_chance_received', ({ log }) => {
    addToast(set, get, '🛡️ İkinci Şans kazandın!', 'success')
    set({ log })
  })

  // Public card count update for any player
  socket.on('player_card_count', ({ playerId, cardCount, log, modifier }) => {
    set(s => ({
      allPlayers: s.allPlayers.map(p => p.id === playerId ? { ...p, cardCount } : p),
      log: log || s.log,
    }))
    if (modifier) {
      addToast(set, get, `${modifier} modifier!`, 'gold')
    }
  })

  socket.on('turn_changed', ({ currentPlayerId, log, allPlayers, deckCount }) => {
    set(s => {
      const myId = s.myPlayerId
      const isMyTurn = currentPlayerId === myId
      return {
        currentPlayerId,
        allPlayers: allPlayers || s.allPlayers,
        deckCount: deckCount ?? s.deckCount,
        log,
        pendingAction: null,
        showOverlay: isMyTurn && s.showOverlay === 'waiting' ? null : s.showOverlay,
      }
    })
  })

  socket.on('player_busted', ({ playerId, log, allPlayers }) => {
    set(s => ({
      allPlayers: allPlayers || s.allPlayers.map(p =>
        p.id === playerId ? { ...p, busted: true } : p
      ),
      log,
    }))
    const player = (allPlayers || get().allPlayers).find(p => p.id === playerId)
    if (player) addToast(set, get, `💥 ${player.name} battı!`, 'error')
  })

  socket.on('player_stayed', ({ playerId, score, log, allPlayers }) => {
    set(s => ({
      allPlayers: allPlayers || s.allPlayers.map(p =>
        p.id === playerId ? { ...p, stayed: true, roundScore: score } : p
      ),
      log,
    }))
    const player = (allPlayers || get().allPlayers).find(p => p.id === playerId)
    if (player) addToast(set, get, `✅ ${player.name} durdu. +${score}`, 'info')
  })

  socket.on('player_frozen', ({ playerId, score, log, allPlayers }) => {
    set(s => ({
      allPlayers: allPlayers || s.allPlayers.map(p =>
        p.id === playerId ? { ...p, frozen: true, stayed: true, roundScore: score } : p
      ),
      log,
    }))
    const player = (allPlayers || get().allPlayers).find(p => p.id === playerId)
    if (player) addToast(set, get, `❄️ ${player.name} donduruldu!`, 'blue')
  })

  socket.on('flip_three_started', ({ targetPlayerId, log }) => {
    set({ log })
    const player = get().allPlayers.find(p => p.id === targetPlayerId)
    if (player) addToast(set, get, `🎲 ${player.name} 3 kart çekiyor!`, 'warning')
  })

  // Action required — only sent to the player who drew the action card
  socket.on('action_required', ({ actionType, fromPlayerId, eligibleTargets, log }) => {
    set({ pendingAction: { actionType, fromPlayerId, eligibleTargets }, log })
  })

  socket.on('flip7', ({ playerId, playerName, log }) => {
    set({ showOverlay: 'flip7', overlayData: { playerId, playerName }, log })
  })

  socket.on('log_update', ({ log, allPlayers }) => {
    set(s => ({
      log,
      allPlayers: allPlayers || s.allPlayers,
    }))
  })

  socket.on('round_ended', ({ scores, flip7WinnerId, round, log }) => {
    set({
      phase: 'roundEnd',
      roundScores: scores,
      showOverlay: null,
      log,
      allPlayers: scores.map(s => ({
        ...get().allPlayers.find(p => p.id === s.id),
        totalScore: s.totalScore,
        roundScore: s.roundScore,
        busted: s.busted,
      })),
    })
  })

  socket.on('game_ended', ({ winner, finalScores }) => {
    set({ phase: 'gameEnd', overlayData: { winner, finalScores } })
  })

  // ── Actions ───────────────────────────────────────────────────────────

  return {
    ...INITIAL,

    connect(name) {
      set({ myName: name })
      socket.connect()
    },

    createRoom(playerName, targetScore) {
      set({ myName: playerName })
      if (!socket.connected) socket.connect()
      socket.emit('create_room', { playerName, targetScore })
    },

    joinRoom(roomCode, playerName) {
      set({ myName: playerName })
      if (!socket.connected) socket.connect()
      socket.emit('join_room', { roomCode: roomCode.trim().toUpperCase(), playerName })
    },

    startGame() {
      const { roomCode } = get()
      socket.emit('start_game', { roomCode })
    },

    hit() {
      const { roomCode } = get()
      socket.emit('hit', { roomCode })
    },

    stay() {
      const { roomCode } = get()
      socket.emit('stay', { roomCode })
    },

    selectActionTarget(targetPlayerId) {
      const { roomCode } = get()
      socket.emit('select_action_target', { roomCode, targetPlayerId })
      set({ pendingAction: null })
    },

    nextRound() {
      const { roomCode } = get()
      socket.emit('next_round', { roomCode })
    },

    dismissOverlay() {
      set({ showOverlay: null, overlayData: null })
    },

    clearError() {
      set({ error: null })
    },

    leaveRoom() {
      socket.disconnect()
      set({ ...INITIAL })
    },
  }
})
