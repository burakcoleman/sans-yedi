import { motion } from 'framer-motion'
import { CARD_TYPE, ACTION, MODIFIER } from '../../logic/deck.js'

const cardStyle = {
  width: 52,
  height: 76,
  borderRadius: 8,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 'bold',
  fontSize: 20,
  flexShrink: 0,
  boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
  border: '2px solid',
  position: 'relative',
  overflow: 'hidden',
}

function getCardColors(card) {
  if (card.type === CARD_TYPE.NUMBER) {
    return { bg: '#1a2240', border: '#3a4880', color: '#e8eaf6' }
  }
  if (card.type === CARD_TYPE.ACTION) {
    if (card.action === ACTION.FREEZE)
      return { bg: '#0d2a4a', border: '#4488ff', color: '#a8d4ff' }
    if (card.action === ACTION.FLIP_THREE)
      return { bg: '#3a0d1a', border: '#ff4466', color: '#ffaabb' }
    if (card.action === ACTION.SECOND_CHANCE)
      return { bg: '#0d3a1a', border: '#00d4aa', color: '#aaffdd' }
  }
  if (card.type === CARD_TYPE.MODIFIER) {
    if (card.modifier === MODIFIER.TIMES_2)
      return { bg: '#2a1a00', border: '#f0c040', color: '#f0c040' }
    return { bg: '#1a0d3a', border: '#aa66ff', color: '#cc99ff' }
  }
  return { bg: '#1a2240', border: '#3a4880', color: '#e8eaf6' }
}

function getCardLabel(card) {
  if (card.type === CARD_TYPE.NUMBER) return card.value.toString()
  if (card.type === CARD_TYPE.ACTION) {
    if (card.action === ACTION.FREEZE) return '❄️'
    if (card.action === ACTION.FLIP_THREE) return '🎲'
    if (card.action === ACTION.SECOND_CHANCE) return '🛡️'
  }
  if (card.type === CARD_TYPE.MODIFIER) {
    if (card.modifier === MODIFIER.TIMES_2) return '×2'
    return card.modifier
  }
  return '?'
}

function getCardSubLabel(card) {
  if (card.type === CARD_TYPE.ACTION) {
    if (card.action === ACTION.FREEZE) return 'Dondur'
    if (card.action === ACTION.FLIP_THREE) return '3 Çek'
    if (card.action === ACTION.SECOND_CHANCE) return '2. Şans'
  }
  return null
}

export function Card({ card, animate = false }) {
  const colors = getCardColors(card)
  const label = getCardLabel(card)
  const sub = getCardSubLabel(card)

  const content = (
    <div
      style={{
        ...cardStyle,
        backgroundColor: colors.bg,
        borderColor: colors.border,
        color: colors.color,
      }}
    >
      <span style={{ fontSize: sub ? 22 : 24, lineHeight: 1 }}>{label}</span>
      {sub && <span style={{ fontSize: 9, marginTop: 2, opacity: 0.8 }}>{sub}</span>}
    </div>
  )

  if (animate) {
    return (
      <motion.div
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        {content}
      </motion.div>
    )
  }

  return content
}
