import { CARD_TYPE, MODIFIER } from './deck.js'

// Calculate score from a hand of cards
// Order: sum all number cards → apply ×2 if present → add +X modifiers
export function calculateScore(hand) {
  const numberSum = hand
    .filter(c => c.type === CARD_TYPE.NUMBER)
    .reduce((acc, c) => acc + c.value, 0)

  const hasDouble = hand.some(c => c.type === CARD_TYPE.MODIFIER && c.modifier === MODIFIER.TIMES_2)

  const plusSum = hand
    .filter(c => c.type === CARD_TYPE.MODIFIER && c.modifier !== MODIFIER.TIMES_2)
    .reduce((acc, c) => acc + parseInt(c.modifier, 10), 0)

  const base = hasDouble ? numberSum * 2 : numberSum
  return base + plusSum
}

export const FLIP7_BONUS = 15

export function applyFlip7Bonus(score) {
  return score + FLIP7_BONUS
}
