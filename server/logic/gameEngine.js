import { CARD_TYPE, ACTION, shuffleDeck } from './deck.js'
import { calculateScore, applyFlip7Bonus } from './scoring.js'

// Returns true if the hand contains a duplicate number card
export function checkBust(hand) {
  const numbers = hand.filter(c => c.type === CARD_TYPE.NUMBER).map(c => c.value)
  return numbers.length !== new Set(numbers).size
}

// Returns true if hand has 7 or more distinct number cards (only number cards count)
export function checkFlip7(hand) {
  const distinctNumbers = new Set(
    hand.filter(c => c.type === CARD_TYPE.NUMBER).map(c => c.value)
  )
  return distinctNumbers.size >= 7
}

// Draw the top card from deck; if deck empty, reshuffle usedCardsPile into deck
// Returns { card, newDeck, newUsedPile }
export function drawCard(deck, usedCardsPile) {
  if (deck.length === 0) {
    if (usedCardsPile.length === 0) return { card: null, newDeck: [], newUsedPile: [] }
    const newDeck = shuffleDeck(usedCardsPile)
    const card = newDeck.shift()
    return { card, newDeck, newUsedPile: [] }
  }
  const newDeck = [...deck]
  const card = newDeck.shift()
  return { card, newDeck, newUsedPile: usedCardsPile }
}

// Find the next player index who is still active (not busted, stayed, or frozen)
export function nextActivePlayerIndex(players, currentIndex) {
  const n = players.length
  for (let i = 1; i < n; i++) {
    const idx = (currentIndex + i) % n
    const p = players[idx]
    if (!p.busted && !p.stayed && !p.frozen) return idx
  }
  return -1 // no active player found
}

// Count currently active players (not busted, not stayed, not frozen)
export function countActivePlayers(players) {
  return players.filter(p => !p.busted && !p.stayed && !p.frozen).length
}

// Check if the round is over (no active players remain)
export function isRoundOver(players) {
  return countActivePlayers(players) === 0
}

// Apply freeze to a target player — banks their score and marks them as frozen/stayed
export function applyFreeze(players, targetIdx) {
  return players.map((p, i) => {
    if (i !== targetIdx) return p
    const roundScore = calculateScore(p.hand)
    return { ...p, frozen: true, stayed: true, roundScore }
  })
}

// Apply Second Chance: player holds the card (stored as hasSecondChance flag + the card)
// Returns updated players array
export function applySecondChance(players, targetIdx, card) {
  return players.map((p, i) => {
    if (i !== targetIdx) return p
    // If player already has a Second Chance, they can't hold another — caller should target someone else
    return { ...p, hasSecondChance: true, secondChanceCard: card }
  })
}

// Use a stored Second Chance to cancel a bust:
// Removes both the duplicate card and the secondChanceCard from hand
// Returns updated player
export function useSecondChance(player, duplicateCard) {
  const newHand = player.hand.filter(c => {
    // Remove the second chance card
    if (c.id === player.secondChanceCard.id) return false
    // Remove exactly one copy of the duplicate number card (the newly drawn one)
    if (c.id === duplicateCard.id) return false
    return true
  })
  return { ...player, hand: newHand, hasSecondChance: false, secondChanceCard: null }
}

// Score all players at round end and add to their totalScore
export function finalizeRoundScores(players, flip7WinnerIdx = -1) {
  return players.map((p, i) => {
    let roundScore = 0
    if (p.busted) {
      roundScore = 0
    } else {
      roundScore = calculateScore(p.hand)
      if (i === flip7WinnerIdx) {
        roundScore = applyFlip7Bonus(roundScore)
      }
    }
    return {
      ...p,
      roundScore,
      totalScore: p.totalScore + roundScore,
    }
  })
}

// Reset players for a new round (keep names and totalScore)
export function resetPlayersForRound(players) {
  return players.map(p => ({
    ...p,
    hand: [],
    roundScore: 0,
    frozen: false,
    stayed: false,
    busted: false,
    hasSecondChance: false,
    secondChanceCard: null,
  }))
}
