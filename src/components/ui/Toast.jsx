import { motion } from 'framer-motion'

const colorMap = {
  info: '#4488ff',
  success: '#00d4aa',
  error: '#ff4466',
  warning: '#f0c040',
  gold: '#f0c040',
  blue: '#4488ff',
}

export function Toast({ toast }) {
  const color = colorMap[toast.type] || '#9aa0c0'
  return (
    <motion.div
      initial={{ opacity: 0, y: -12, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.9 }}
      style={{
        background: '#141929',
        border: `1px solid ${color}44`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 10,
        padding: '8px 16px',
        color: '#e8eaf6',
        fontSize: 13,
        maxWidth: 280,
        textAlign: 'center',
        pointerEvents: 'none',
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
      }}
    >
      {toast.message}
    </motion.div>
  )
}
