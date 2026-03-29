import { useState } from 'react'
import { motion } from 'framer-motion'
import { useGameStore } from '../../store/gameStore.js'

export function SetupScreen() {
  const [playerCount, setPlayerCount] = useState(2)
  const [names, setNames] = useState(['', '', '', '', '', ''])
  const [targetScore, setTargetScore] = useState(200)
  const { setPlayerNames, startGame } = useGameStore()

  const handleStart = () => {
    const usedNames = names.slice(0, playerCount)
    setPlayerNames(usedNames, targetScore)
    startGame()
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: '#0a0e1a',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'flex-start',
      padding: '32px 20px 40px',
      overflowY: 'auto',
    }}>
      {/* Logo */}
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        style={{ textAlign: 'center', marginBottom: 32 }}
      >
        <div style={{ fontSize: 56, marginBottom: -8 }}>🃏</div>
        <h1 style={{
          fontSize: 48, fontWeight: 900, margin: 0,
          background: 'linear-gradient(135deg, #f0c040, #aa66ff)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          letterSpacing: -1,
        }}>
          Şans Yedi
        </h1>
        <p style={{ color: '#556', fontSize: 14, margin: '4px 0 0', letterSpacing: 2 }}>
          TÜRKÇE KART OYUNU
        </p>
      </motion.div>

      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Player Count */}
        <section style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', color: '#9aa0c0', fontSize: 13, marginBottom: 10, letterSpacing: 1 }}>
            OYUNCU SAYISI
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[2, 3, 4, 5, 6].map(n => (
              <button
                key={n}
                onClick={() => setPlayerCount(n)}
                style={{
                  flex: 1, height: 56, borderRadius: 12, border: '2px solid',
                  borderColor: playerCount === n ? '#f0c040' : '#2a3050',
                  background: playerCount === n ? '#2a1f00' : '#141929',
                  color: playerCount === n ? '#f0c040' : '#9aa0c0',
                  fontSize: 18, fontWeight: 700, cursor: 'pointer',
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </section>

        {/* Names */}
        <section style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', color: '#9aa0c0', fontSize: 13, marginBottom: 10, letterSpacing: 1 }}>
            OYUNCU İSİMLERİ
          </label>
          {Array.from({ length: playerCount }, (_, i) => (
            <div key={i} style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                width: 32, height: 32, borderRadius: '50%',
                background: '#1f2d4a', border: '2px solid #3a4880',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#f0c040', fontWeight: 700, fontSize: 14, flexShrink: 0,
              }}>
                {i + 1}
              </span>
              <input
                type="text"
                placeholder={`Oyuncu ${i + 1}`}
                value={names[i]}
                maxLength={16}
                onChange={e => {
                  const updated = [...names]
                  updated[i] = e.target.value
                  setNames(updated)
                }}
                style={{
                  flex: 1, height: 52, borderRadius: 12, border: '2px solid #2a3050',
                  background: '#141929', color: '#e8eaf6', fontSize: 16, padding: '0 14px',
                  outline: 'none',
                }}
              />
            </div>
          ))}
        </section>

        {/* Target Score */}
        <section style={{ marginBottom: 32 }}>
          <label style={{ display: 'block', color: '#9aa0c0', fontSize: 13, marginBottom: 10, letterSpacing: 1 }}>
            HEDEF PUAN
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[100, 200, 300].map(n => (
              <button
                key={n}
                onClick={() => setTargetScore(n)}
                style={{
                  flex: 1, height: 56, borderRadius: 12, border: '2px solid',
                  borderColor: targetScore === n ? '#00d4aa' : '#2a3050',
                  background: targetScore === n ? '#0a2020' : '#141929',
                  color: targetScore === n ? '#00d4aa' : '#9aa0c0',
                  fontSize: 18, fontWeight: 700, cursor: 'pointer',
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </section>

        {/* Start Button */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleStart}
          style={{
            width: '100%', height: 64, borderRadius: 16, border: 'none',
            background: 'linear-gradient(135deg, #f0c040, #d4a030)',
            color: '#0a0e1a', fontSize: 22, fontWeight: 900, cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(240,192,64,0.3)',
          }}
        >
          🎴 Oyunu Başlat
        </motion.button>
      </div>
    </div>
  )
}
