import { buildDeck, shuffleDeck, CARD_TYPE, ACTION } from './logic/deck.js'
import {
  checkBust,
  checkFlip7,
  drawCard,
  nextActivePlayerIndex,
  isRoundOver,
  applyFreeze,
  applySecondChance,
  useSecondChance,
  finalizeRoundScores,
  resetPlayersForRound,
  countActivePlayers,
} from './logic/gameEngine.js'
import { calculateScore } from './logic/scoring.js'

const rooms = new Map()

// ─── HELPERS ──────────────────────────────────────────────────────────────

function generateRoomCode() {
  let code
  do {
    code = String(Math.floor(1000 + Math.random() * 9000))
  } while (rooms.has(code))
  return code
}

function makePlayer(socketId, name, idx) {
  return {
    id: idx,
    socketId,
    name: name || `Oyuncu ${idx + 1}`,
    totalScore: 0,
    roundScore: 0,
    hand: [],
    frozen: false,
    stayed: false,
    busted: false,
    hasSecondChance: false,
    secondChanceCard: null,
    connected: true,
  }
}

// What each client is allowed to see about a player
function publicPlayer(p) {
  return {
    id: p.id,
    name: p.name,
    totalScore: p.totalScore,
    roundScore: p.busted ? 0 : calculateScore(p.hand),
    cardCount: p.hand.length,
    frozen: p.frozen,
    stayed: p.stayed,
    busted: p.busted,
    hasSecondChance: p.hasSecondChance,
    connected: p.connected,
  }
}

function publicPlayers(players) {
  return players.map(publicPlayer)
}

// ─── ROOM MANAGEMENT ──────────────────────────────────────────────────────

export function createRoom(socketId, playerName, targetScore = 200) {
  const code = generateRoomCode()
  const player = makePlayer(socketId, playerName, 0)
  const room = {
    code,
    players: [player],
    hostSocketId: socketId,
    targetScore,
    deck: [],
    usedCardsPile: [],
    discardPile: [],
    currentPlayerIndex: 0,
    dealerIndex: 0,
    round: 1,
    phase: 'lobby',
    pendingAction: null,
    flipThreeState: null,
    flip7WinnerIdx: -1,
    log: '',
  }
  rooms.set(code, room)
  return { code, player }
}

export function joinRoom(socketId, roomCode, playerName) {
  const room = rooms.get(roomCode)
  if (!room) return { error: 'Oda bulunamadı.' }
  if (room.phase !== 'lobby') {
    // Allow rejoin if disconnected player with same name
    const existing = room.players.find(p => p.name === playerName && !p.connected)
    if (existing) {
      existing.socketId = socketId
      existing.connected = true
      return { room, player: existing, rejoined: true }
    }
    return { error: 'Oyun başladı. Yeni oyuncu kabul edilmiyor.' }
  }
  if (room.players.length >= 6) return { error: 'Oda dolu (maks. 6 oyuncu).' }

  const player = makePlayer(socketId, playerName, room.players.length)
  room.players.push(player)
  return { room, player }
}

export function getRoom(roomCode) {
  return rooms.get(roomCode)
}

export function getRoomBySocket(socketId) {
  for (const room of rooms.values()) {
    if (room.players.some(p => p.socketId === socketId)) return room
  }
  return null
}

export function markDisconnected(socketId) {
  const room = getRoomBySocket(socketId)
  if (!room) return null
  const player = room.players.find(p => p.socketId === socketId)
  if (player) player.connected = false
  // Clean up empty rooms after a delay (handled outside)
  return { room, player }
}

export function deleteRoom(roomCode) {
  rooms.delete(roomCode)
}

// ─── GAME START ───────────────────────────────────────────────────────────

export function startGame(room) {
  room.deck = shuffleDeck(buildDeck())
  room.usedCardsPile = []
  room.discardPile = []
  room.round = 1
  room.dealerIndex = 0
  room.currentPlayerIndex = 0
  room.flip7WinnerIdx = -1
  room.pendingAction = null
  room.flipThreeState = null
  room.phase = 'dealing'
  room.log = 'Kartlar dağıtılıyor...'
  room.players = room.players.map(p => ({
    ...p,
    hand: [], roundScore: 0,
    frozen: false, stayed: false, busted: false,
    hasSecondChance: false, secondChanceCard: null,
  }))
}

// ─── DEALING ──────────────────────────────────────────────────────────────
// Returns array of events to emit: [{target: 'player'|'room', playerId?, event, data}]

export function dealAll(room) {
  const events = []
  dealNextCard(room, 0, events)
  return events
}

function dealNextCard(room, dealToIdx, events) {
  const n = room.players.length
  if (dealToIdx >= n) {
    // Dealing complete — start playing
    const startIdx = (room.dealerIndex + 1) % n
    room.phase = 'playing'
    room.currentPlayerIndex = startIdx
    room.log = `${room.players[startIdx].name}'in sırası.`
    events.push({ target: 'room', event: 'turn_changed', data: {
      currentPlayerId: room.players[startIdx].id,
      log: room.log,
      allPlayers: publicPlayers(room.players),
      deckCount: room.deck.length,
    }})
    return
  }

  const { card, newDeck, newUsedPile } = drawCard(room.deck, room.usedCardsPile)
  room.deck = newDeck
  room.usedCardsPile = newUsedPile

  if (!card) {
    room.phase = 'playing'
    return
  }

  if (card.type === CARD_TYPE.NUMBER || card.type === CARD_TYPE.MODIFIER) {
    room.players[dealToIdx].hand.push(card)
    events.push({
      target: 'player',
      playerId: room.players[dealToIdx].id,
      event: 'your_card',
      data: { card, source: 'deal' },
    })
    events.push({ target: 'room', event: 'player_card_count', data: {
      playerId: room.players[dealToIdx].id,
      cardCount: room.players[dealToIdx].hand.length,
    }})
    dealNextCard(room, dealToIdx + 1, events)
  } else {
    // Action card during deal
    resolveDealAction(room, card, dealToIdx, events, () => dealNextCard(room, dealToIdx + 1, events))
  }
}

function resolveDealAction(room, card, dealToIdx, events, cont) {
  const target = room.players[dealToIdx]

  if (card.action === ACTION.FREEZE) {
    room.players = applyFreeze(room.players, dealToIdx)
    room.discardPile.push(card)
    room.log = `${target.name} dağıtımda donduruldu!`
    events.push({ target: 'room', event: 'player_frozen', data: {
      playerId: target.id, score: 0, log: room.log, allPlayers: publicPlayers(room.players),
    }})
    cont()
  } else if (card.action === ACTION.SECOND_CHANCE) {
    if (!target.hasSecondChance) {
      room.players = applySecondChance(room.players, dealToIdx, card)
      room.log = `${target.name} İkinci Şans kazandı!`
      events.push({ target: 'player', playerId: target.id, event: 'second_chance_received', data: { log: room.log } })
      events.push({ target: 'room', event: 'player_card_count', data: {
        playerId: target.id, cardCount: target.hand.length,
      }})
    } else {
      const altIdx = room.players.findIndex((p, i) => i !== dealToIdx && !p.hasSecondChance && !p.frozen && !p.busted)
      if (altIdx >= 0) {
        room.players = applySecondChance(room.players, altIdx, card)
        room.log = `${room.players[altIdx].name} İkinci Şans kazandı!`
        events.push({ target: 'player', playerId: room.players[altIdx].id, event: 'second_chance_received', data: { log: room.log } })
      } else {
        room.discardPile.push(card)
      }
    }
    cont()
  } else if (card.action === ACTION.FLIP_THREE) {
    dealFlipThreeDuringDeal(room, card, dealToIdx, 3, events, cont)
  }
}

function dealFlipThreeDuringDeal(room, flipCard, targetIdx, remaining, events, cont) {
  if (remaining === 0) {
    room.discardPile.push(flipCard)
    cont()
    return
  }
  const { card, newDeck, newUsedPile } = drawCard(room.deck, room.usedCardsPile)
  room.deck = newDeck
  room.usedCardsPile = newUsedPile
  if (!card) { cont(); return }

  const target = room.players[targetIdx]

  if (card.type === CARD_TYPE.NUMBER) {
    const newHand = [...target.hand, card]
    if (checkBust(newHand)) {
      room.players[targetIdx] = { ...target, busted: true, stayed: true, roundScore: 0 }
      room.discardPile.push(flipCard, card)
      room.log = `${target.name} Üç Çek'te battı! (dağıtım)`
      events.push({ target: 'room', event: 'player_busted', data: {
        playerId: target.id, log: room.log, allPlayers: publicPlayers(room.players),
      }})
      cont()
    } else {
      room.players[targetIdx].hand.push(card)
      events.push({ target: 'player', playerId: target.id, event: 'your_card', data: { card, source: 'flipThree' } })
      events.push({ target: 'room', event: 'player_card_count', data: { playerId: target.id, cardCount: newHand.length } })
      dealFlipThreeDuringDeal(room, flipCard, targetIdx, remaining - 1, events, cont)
    }
  } else {
    room.discardPile.push(card)
    dealFlipThreeDuringDeal(room, flipCard, targetIdx, remaining - 1, events, cont)
  }
}

// ─── PLAYING PHASE ────────────────────────────────────────────────────────

export function playerHit(room, playerId) {
  const playerIdx = room.players.findIndex(p => p.id === playerId)
  if (playerIdx < 0) return []
  if (room.currentPlayerIndex !== playerIdx) return [{ target: 'player', playerId, event: 'error', data: { message: 'Sıra sende değil.' } }]

  const events = []
  const { card, newDeck, newUsedPile } = drawCard(room.deck, room.usedCardsPile)
  room.deck = newDeck
  room.usedCardsPile = newUsedPile

  if (!card) {
    events.push({ target: 'room', event: 'log_update', data: { log: 'Deste bitti!' } })
    return events
  }

  processDrawnCard(room, card, playerIdx, events)
  return events
}

export function playerStay(room, playerId) {
  const playerIdx = room.players.findIndex(p => p.id === playerId)
  if (playerIdx < 0) return []
  if (room.currentPlayerIndex !== playerIdx) return []

  const player = room.players[playerIdx]
  const score = calculateScore(player.hand)
  room.players[playerIdx] = { ...player, stayed: true, roundScore: score }

  const events = []
  room.log = `${player.name} durdu. ${score} puan bankaladı.`
  events.push({ target: 'room', event: 'player_stayed', data: {
    playerId: player.id,
    score,
    log: room.log,
    allPlayers: publicPlayers(room.players),
  }})

  advanceTurn(room, events)
  return events
}

export function selectTarget(room, fromPlayerId, targetPlayerId) {
  const { pendingAction } = room
  if (!pendingAction) return []

  const events = []
  const targetIdx = room.players.findIndex(p => p.id === targetPlayerId)
  const fromIdx = room.players.findIndex(p => p.id === fromPlayerId)
  const target = room.players[targetIdx]
  const from = room.players[fromIdx]

  room.pendingAction = null

  if (pendingAction.type === ACTION.FREEZE) {
    room.players = applyFreeze(room.players, targetIdx)
    room.log = `${from.name}, ${target.name}'i dondurdu!`
    events.push({ target: 'room', event: 'player_frozen', data: {
      playerId: target.id,
      score: calculateScore(target.hand),
      log: room.log,
      allPlayers: publicPlayers(room.players),
    }})
    advanceTurn(room, events)

  } else if (pendingAction.type === ACTION.FLIP_THREE) {
    room.flipThreeState = { targetIdx, cardsLeft: 3, queuedActions: [] }
    room.log = `${from.name}, ${target.name}'e Üç Çek uyguladı!`
    events.push({ target: 'room', event: 'flip_three_started', data: {
      targetPlayerId: target.id, log: room.log,
    }})
    drawFlipThreeCard(room, events)

  } else if (pendingAction.type === ACTION.SECOND_CHANCE) {
    room.players = applySecondChance(room.players, targetIdx, pendingAction.card)
    room.log = `${target.name} İkinci Şans kazandı!`
    events.push({ target: 'player', playerId: target.id, event: 'second_chance_received', data: { log: room.log } })
    events.push({ target: 'room', event: 'log_update', data: { log: room.log, allPlayers: publicPlayers(room.players) } })
    advanceTurn(room, events)
  }

  return events
}

// ─── CARD PROCESSING ──────────────────────────────────────────────────────

function processDrawnCard(room, card, playerIdx, events) {
  const player = room.players[playerIdx]

  if (card.type === CARD_TYPE.NUMBER) {
    const newHand = [...player.hand, card]

    // Second Chance saves from bust
    if (checkBust(newHand) && player.hasSecondChance) {
      const updated = useSecondChance(player, card)
      room.players[playerIdx] = updated
      room.log = `${player.name} İkinci Şans kullandı! Kurtuldu.`
      events.push({ target: 'room', event: 'log_update', data: { log: room.log, allPlayers: publicPlayers(room.players) } })
      advanceTurn(room, events)
      return
    }

    if (checkBust(newHand)) {
      room.players[playerIdx] = { ...player, hand: newHand, busted: true, stayed: true, roundScore: 0 }
      room.log = `${player.name} battı! 0 puan.`
      events.push({
        target: 'player', playerId: player.id, event: 'your_card',
        data: { card, source: 'hit', busted: true },
      })
      events.push({ target: 'room', event: 'player_busted', data: {
        playerId: player.id, log: room.log, allPlayers: publicPlayers(room.players),
      }})
      advanceTurn(room, events)
      return
    }

    room.players[playerIdx].hand.push(card)
    room.log = `${player.name} kart çekti.`

    events.push({ target: 'player', playerId: player.id, event: 'your_card', data: { card, source: 'hit' } })
    events.push({ target: 'room', event: 'player_card_count', data: {
      playerId: player.id,
      cardCount: room.players[playerIdx].hand.length,
      log: room.log,
    }})

    if (checkFlip7(room.players[playerIdx].hand)) {
      room.flip7WinnerIdx = playerIdx
      room.log = `🌟 ${player.name} ŞANS YEDİ!`
      events.push({ target: 'room', event: 'flip7', data: {
        playerId: player.id, playerName: player.name, log: room.log,
      }})
      endRound(room, playerIdx, events)
      return
    }

    advanceTurn(room, events)

  } else if (card.type === CARD_TYPE.MODIFIER) {
    room.players[playerIdx].hand.push(card)
    const label = card.modifier === 'x2' ? '×2' : card.modifier
    room.log = `${player.name} ${label} modifier çekti.`
    events.push({ target: 'player', playerId: player.id, event: 'your_card', data: { card, source: 'hit' } })
    events.push({ target: 'room', event: 'player_card_count', data: {
      playerId: player.id,
      cardCount: room.players[playerIdx].hand.length,
      log: room.log,
      modifier: label,
    }})
    advanceTurn(room, events)

  } else if (card.type === CARD_TYPE.ACTION) {
    room.discardPile.push(card)
    room.pendingAction = { type: card.action, fromPlayerIdx: playerIdx, card }

    if (card.action === ACTION.SECOND_CHANCE) {
      if (!player.hasSecondChance) {
        // Give to self
        room.players = applySecondChance(room.players, playerIdx, card)
        room.pendingAction = null
        room.log = `${player.name} İkinci Şans kazandı!`
        events.push({ target: 'player', playerId: player.id, event: 'second_chance_received', data: { log: room.log } })
        events.push({ target: 'room', event: 'log_update', data: { log: room.log, allPlayers: publicPlayers(room.players) } })
        advanceTurn(room, events)
        return
      }
      const altTargets = room.players.filter(p => !p.hasSecondChance && !p.busted && !p.stayed && !p.frozen)
      if (altTargets.length === 0) {
        room.pendingAction = null
        room.discardPile.push(card)
        advanceTurn(room, events)
        return
      }
      if (altTargets.length === 1) {
        // Auto-assign
        const targetIdx = room.players.findIndex(p => p.id === altTargets[0].id)
        room.players = applySecondChance(room.players, targetIdx, card)
        room.pendingAction = null
        room.log = `${altTargets[0].name} İkinci Şans kazandı!`
        events.push({ target: 'player', playerId: altTargets[0].id, event: 'second_chance_received', data: { log: room.log } })
        events.push({ target: 'room', event: 'log_update', data: { log: room.log, allPlayers: publicPlayers(room.players) } })
        advanceTurn(room, events)
        return
      }
    }

    const activeTargets = room.players.filter((p, i) => !p.busted && !p.stayed && !p.frozen)
    const activeOthers = room.players.filter((p, i) => i !== playerIdx && !p.busted && !p.stayed && !p.frozen)

    if (activeOthers.length === 0) {
      // Only player left — self-target
      const selfTargetEvents = selectTarget(room, player.id, player.id)
      events.push(...selfTargetEvents)
      return
    }

    const actionLabel = card.action === ACTION.FREEZE ? 'Dondur' : card.action === ACTION.FLIP_THREE ? 'Üç Çek' : 'İkinci Şans'
    room.log = `${player.name} ${actionLabel} çekti. Hedef seç.`
    events.push({ target: 'player', playerId: player.id, event: 'action_required', data: {
      actionType: card.action,
      fromPlayerId: player.id,
      eligibleTargets: activeOthers.map(p => ({ id: p.id, name: p.name })),
      log: room.log,
    }})
    events.push({ target: 'room', event: 'log_update', data: { log: room.log } })
  }
}

function drawFlipThreeCard(room, events) {
  const { flipThreeState } = room
  if (!flipThreeState) return

  const { targetIdx, cardsLeft, queuedActions } = flipThreeState

  if (cardsLeft === 0) {
    room.flipThreeState = null
    if (queuedActions.length > 0) {
      const [first, ...rest] = queuedActions
      room.pendingAction = first
      const target = room.players[first.fromPlayerIdx]
      const activeOthers = room.players.filter((p, i) => i !== first.fromPlayerIdx && !p.busted && !p.stayed && !p.frozen)
      if (activeOthers.length === 0) {
        const selfEvents = selectTarget(room, target.id, target.id)
        events.push(...selfEvents)
      } else {
        const actionLabel = first.type === ACTION.FREEZE ? 'Dondur' : first.type === ACTION.FLIP_THREE ? 'Üç Çek' : 'İkinci Şans'
        events.push({ target: 'player', playerId: target.id, event: 'action_required', data: {
          actionType: first.type,
          fromPlayerId: target.id,
          eligibleTargets: activeOthers.map(p => ({ id: p.id, name: p.name })),
          log: `${target.name} ${actionLabel} çekti (Üç Çek sonrası). Hedef seç.`,
        }})
      }
    } else {
      advanceTurn(room, events)
    }
    return
  }

  const { card, newDeck, newUsedPile } = drawCard(room.deck, room.usedCardsPile)
  room.deck = newDeck
  room.usedCardsPile = newUsedPile
  if (!card) { room.flipThreeState = null; advanceTurn(room, events); return }

  const target = room.players[targetIdx]

  if (card.type === CARD_TYPE.NUMBER) {
    const newHand = [...target.hand, card]

    if (checkBust(newHand) && target.hasSecondChance) {
      const updated = useSecondChance(target, card)
      room.players[targetIdx] = updated
      room.log = `${target.name} İkinci Şans kullandı!`
      events.push({ target: 'room', event: 'log_update', data: { log: room.log, allPlayers: publicPlayers(room.players) } })
      room.flipThreeState = { ...flipThreeState, cardsLeft: cardsLeft - 1 }
      drawFlipThreeCard(room, events)
      return
    }

    if (checkBust(newHand)) {
      room.players[targetIdx] = { ...target, hand: newHand, busted: true, stayed: true, roundScore: 0 }
      room.flipThreeState = null
      room.log = `${target.name} Üç Çek'te battı!`
      events.push({ target: 'player', playerId: target.id, event: 'your_card', data: { card, source: 'flipThree', busted: true } })
      events.push({ target: 'room', event: 'player_busted', data: {
        playerId: target.id, log: room.log, allPlayers: publicPlayers(room.players),
      }})
      advanceTurn(room, events)
      return
    }

    if (checkFlip7(newHand)) {
      room.players[targetIdx].hand.push(card)
      room.flipThreeState = null
      room.flip7WinnerIdx = targetIdx
      room.log = `🌟 ${target.name} ŞANS YEDİ! (Üç Çek sırasında)`
      events.push({ target: 'player', playerId: target.id, event: 'your_card', data: { card, source: 'flipThree' } })
      events.push({ target: 'room', event: 'flip7', data: { playerId: target.id, playerName: target.name, log: room.log } })
      endRound(room, targetIdx, events)
      return
    }

    room.players[targetIdx].hand.push(card)
    room.log = `${target.name} ${card.value} çekti (Üç Çek: ${4 - cardsLeft}/3).`
    events.push({ target: 'player', playerId: target.id, event: 'your_card', data: { card, source: 'flipThree' } })
    events.push({ target: 'room', event: 'player_card_count', data: {
      playerId: target.id, cardCount: newHand.length, log: room.log,
    }})
    room.flipThreeState = { ...flipThreeState, cardsLeft: cardsLeft - 1 }
    drawFlipThreeCard(room, events)

  } else if (card.type === CARD_TYPE.MODIFIER) {
    room.players[targetIdx].hand.push(card)
    const label = card.modifier === 'x2' ? '×2' : card.modifier
    room.log = `${target.name} ${label} modifier çekti (Üç Çek).`
    events.push({ target: 'player', playerId: target.id, event: 'your_card', data: { card, source: 'flipThree' } })
    events.push({ target: 'room', event: 'player_card_count', data: { playerId: target.id, cardCount: target.hand.length + 1, log: room.log } })
    room.flipThreeState = { ...flipThreeState, cardsLeft: cardsLeft - 1 }
    drawFlipThreeCard(room, events)

  } else if (card.type === CARD_TYPE.ACTION) {
    room.discardPile.push(card)
    const newQueued = [...queuedActions, { type: card.action, fromPlayerIdx: targetIdx, card }]
    room.log = `${target.name} aksiyon çekti (Üç Çek). Sonra çözümlenecek.`
    events.push({ target: 'room', event: 'log_update', data: { log: room.log } })
    room.flipThreeState = { ...flipThreeState, cardsLeft: cardsLeft - 1, queuedActions: newQueued }
    drawFlipThreeCard(room, events)
  }
}

// ─── TURN MANAGEMENT ──────────────────────────────────────────────────────

function advanceTurn(room, events) {
  if (isRoundOver(room.players)) {
    endRound(room, -1, events)
    return
  }
  const next = nextActivePlayerIndex(room.players, room.currentPlayerIndex)
  if (next === -1) {
    endRound(room, -1, events)
    return
  }
  room.currentPlayerIndex = next
  room.log = `${room.players[next].name}'in sırası.`
  events.push({ target: 'room', event: 'turn_changed', data: {
    currentPlayerId: room.players[next].id,
    log: room.log,
    allPlayers: publicPlayers(room.players),
    deckCount: room.deck.length,
  }})
}

// ─── ROUND END ────────────────────────────────────────────────────────────

function endRound(room, flip7WinnerIdx, events) {
  const cardsFromHands = room.players.flatMap(p => p.hand)
  room.usedCardsPile = [...room.usedCardsPile, ...room.discardPile, ...cardsFromHands]
  room.discardPile = []

  room.players = finalizeRoundScores(room.players, flip7WinnerIdx)
  room.phase = 'roundEnd'
  room.flip7WinnerIdx = flip7WinnerIdx

  const scores = room.players.map(p => ({
    id: p.id,
    name: p.name,
    roundScore: p.roundScore,
    totalScore: p.totalScore,
    busted: p.busted,
  }))

  events.push({ target: 'room', event: 'round_ended', data: {
    scores,
    flip7WinnerId: flip7WinnerIdx >= 0 ? room.players[flip7WinnerIdx].id : null,
    round: room.round,
    log: room.log,
  }})
}

export function startNextRound(room) {
  const maxScore = Math.max(...room.players.map(p => p.totalScore))
  if (maxScore >= room.targetScore) {
    room.phase = 'gameEnd'
    const sorted = [...room.players].sort((a, b) => b.totalScore - a.totalScore)
    const winner = sorted[0]
    return [{
      target: 'room',
      event: 'game_ended',
      data: {
        winner: { id: winner.id, name: winner.name, score: winner.totalScore },
        finalScores: sorted.map(p => ({ id: p.id, name: p.name, totalScore: p.totalScore })),
      },
    }]
  }

  room.round += 1
  room.dealerIndex = (room.dealerIndex + 1) % room.players.length
  room.currentPlayerIndex = room.dealerIndex
  room.flip7WinnerIdx = -1
  room.pendingAction = null
  room.flipThreeState = null
  room.phase = 'dealing'
  room.log = 'Kartlar dağıtılıyor...'

  // Refill deck if needed
  if (room.deck.length === 0) {
    room.deck = shuffleDeck(room.usedCardsPile)
    room.usedCardsPile = []
  }

  room.players = resetPlayersForRound(room.players)

  const events = []
  events.push({ target: 'room', event: 'round_started', data: {
    round: room.round, allPlayers: publicPlayers(room.players),
  }})
  dealAll(room).forEach(e => events.push(e))
  return events
}
