import { useEffect } from 'react'
import { motion } from 'framer-motion'

export function BustOverlay({ playerName, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 2200)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(255, 30, 60, 0.18)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(2px)',
      }}
      onClick={onDismiss}
    >
      <motion.div
        animate={{ x: [0, -12, 12, -8, 8, 0] }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{
          background: '#1a0808',
          border: '3px solid #ff4466',
          borderRadius: 20,
          padding: '32px 40px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 48 }}>💥</div>
        <div style={{ fontSize: 28, fontWeight: 900, color: '#ff4466', marginTop: 8 }}>
          BATTINIZ!
        </div>
        <div style={{ fontSize: 16, color: '#e8eaf6', marginTop: 6 }}>
          {playerName} bu turda <strong>0 puan</strong> aldı.
        </div>
        <div style={{ fontSize: 13, color: '#666', marginTop: 16 }}>
          Devam etmek için dokun
        </div>
      </motion.div>
    </motion.div>
  )
}
