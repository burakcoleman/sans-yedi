// Card types
export const CARD_TYPE = {
  NUMBER: 'number',
  ACTION: 'action',
  MODIFIER: 'modifier',
}

export const ACTION = {
  FREEZE: 'freeze',       // Dondur
  FLIP_THREE: 'flipThree', // Üç Çek
  SECOND_CHANCE: 'secondChance', // İkinci Şans
}

export const MODIFIER = {
  PLUS_2: '+2',
  PLUS_4: '+4',
  PLUS_6: '+6',
  PLUS_8: '+8',
  PLUS_10: '+10',
  TIMES_2: 'x2',
}

// Build a fresh 94-card deck
export function buildDeck() {
  const deck = []
  let id = 0

  // Number cards: digit N appears N times, except 0 and 1 which appear once
  // 0×1, 1×1, 2×2, 3×3, 4×4, 5×5, 6×6, 7×7, 8×8, 9×9, 10×10, 11×11, 12×12
  // Total: 1+1+2+3+4+5+6+7+8+9+10+11+12 = 79
  const numberCounts = [1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
  for (let num = 0; num <= 12; num++) {
    const count = numberCounts[num]
    for (let i = 0; i < count; i++) {
      deck.push({ id: id++, type: CARD_TYPE.NUMBER, value: num })
    }
  }

  // Action cards: 3 each = 9 total
  for (let i = 0; i < 3; i++) {
    deck.push({ id: id++, type: CARD_TYPE.ACTION, action: ACTION.FREEZE })
    deck.push({ id: id++, type: CARD_TYPE.ACTION, action: ACTION.FLIP_THREE })
    deck.push({ id: id++, type: CARD_TYPE.ACTION, action: ACTION.SECOND_CHANCE })
  }

  // Modifier cards: 6 total
  for (const mod of [MODIFIER.PLUS_2, MODIFIER.PLUS_4, MODIFIER.PLUS_6, MODIFIER.PLUS_8, MODIFIER.PLUS_10, MODIFIER.TIMES_2]) {
    deck.push({ id: id++, type: CARD_TYPE.MODIFIER, modifier: mod })
  }

  return deck
}

// Fisher-Yates shuffle — returns a new shuffled array
export function shuffleDeck(deck) {
  const arr = [...deck]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}
