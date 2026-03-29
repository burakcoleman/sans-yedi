import { motion } from 'framer-motion'
import { useSocketStore } from '../../store/socketStore.js'
import { Confetti } from '../ui/Confetti.jsx'

export function WinScreen() {
  const { overlayData, leaveRoom, myPlayerId } = useSocketStore()
  const { winner, finalScores } = overlayData || { winner: null, finalScores: [] }
  const isWinner = winner?.id === myPlayerId

  return (
    <div style={{
      minHeight: '100dvh', background: '#0a0e1a',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '32px 20px', textAlign: 'center',
    }}>
      <Confetti active />

      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 180, damping: 14, delay: 0.1 }}
        style={{ fontSize: 80, marginBottom: 8 }}
      >
        {isWinner ? '🏆' : '🎉'}
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {isWinner ? (
          <div style={{ fontSize: 28, fontWeight: 900, color: '#f0c040', marginBottom: 4 }}>
            Kazandın! 🌟
          </div>
        ) : (
          <div style={{ fontSize: 20, color: '#9aa0c0', marginBottom: 4 }}>Kazanan:</div>
        )}
        {!isWinner && winner && (
          <div style={{
            fontSize: 30, fontWeight: 900,
            background: 'linear-gradient(135deg, #f0c040, #aa66ff)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            {winner.name}
          </div>
        )}
        {winner && (
          <div style={{ fontSize: 20, color: '#f0c040', fontWeight: 700, marginTop: 4 }}>
            {winner.score} puan
          </div>
        )}
      </motion.div>

      {/* Leaderboard */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        style={{
          width: '100%', maxWidth: 360,
          background: '#141929', borderRadius: 16, padding: 20, marginTop: 28,
        }}
      >
        {(finalScores || []).map((p, i) => (
          <div
            key={p.id}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 0',
              borderBottom: i < finalScores.length - 1 ? '1px solid #1f2d4a' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{
                width: 28, height: 28, borderRadius: '50%',
                background: i === 0 ? '#2a1f00' : '#1a2240',
                border: `2px solid ${i === 0 ? '#f0c040' : '#2a3050'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: i === 0 ? '#f0c040' : '#9aa0c0',
                fontWeight: 700, fontSize: 13, flexShrink: 0,
              }}>
                {i + 1}
              </span>
              <span style={{
                color: p.id === myPlayerId ? '#f0c040' : (i === 0 ? '#e8eaf6' : '#9aa0c0'),
                fontWeight: i === 0 ? 700 : 400,
              }}>
                {p.name}
                {p.id === myPlayerId && <span style={{ fontSize: 11, color: '#556' }}> (sen)</span>}
              </span>
            </div>
            <span style={{ color: i === 0 ? '#f0c040' : '#e8eaf6', fontWeight: 700, fontSize: 18 }}>
              {p.totalScore}
            </span>
          </div>
        ))}
      </motion.div>

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={leaveRoom}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        style={{
          marginTop: 28, width: '100%', maxWidth: 360, height: 60, borderRadius: 16,
          background: 'linear-gradient(135deg, #f0c040, #d4a030)',
          color: '#0a0e1a', fontSize: 18, fontWeight: 900, border: 'none', cursor: 'pointer',
        }}
      >
        🏠 Ana Menü
      </motion.button>
    </div>
  )
}
