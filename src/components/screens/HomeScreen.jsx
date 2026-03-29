import { useState } from 'react'
import { motion } from 'framer-motion'
import { useSocketStore } from '../../store/socketStore.js'

export function HomeScreen() {
  const [view, setView] = useState('home')  // 'home' | 'create' | 'join'
  const [name, setName] = useState('')
  const [roomCode, setRoomCode] = useState('')
  const [targetScore, setTargetScore] = useState(200)
  const { createRoom, joinRoom, error, clearError, connected } = useSocketStore()

  const handleCreate = () => {
    if (!name.trim()) return
    clearError()
    createRoom(name.trim(), targetScore)
  }

  const handleJoin = () => {
    if (!name.trim() || roomCode.length < 4) return
    clearError()
    joinRoom(roomCode, name.trim())
  }

  return (
    <div style={{
      minHeight: '100dvh', background: '#0a0e1a',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '32px 20px',
    }}>
      {/* Logo */}
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        style={{ textAlign: 'center', marginBottom: 40 }}
      >
        <div style={{ fontSize: 56 }}>🃏</div>
        <h1 style={{
          fontSize: 48, fontWeight: 900, margin: '0 0 4px',
          background: 'linear-gradient(135deg, #f0c040, #aa66ff)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          Şans Yedi
        </h1>
        <p style={{ color: '#445', fontSize: 13, margin: 0, letterSpacing: 2 }}>
          ONLINE ÇOKLU OYUNCU
        </p>
      </motion.div>

      <div style={{ width: '100%', maxWidth: 380 }}>
        {error && (
          <div style={{
            background: '#3a0d1a', border: '1px solid #ff4466', borderRadius: 10,
            padding: '10px 14px', marginBottom: 16, color: '#ff8899', fontSize: 14,
            textAlign: 'center',
          }}>
            {error}
          </div>
        )}

        {view === 'home' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <button
              onClick={() => setView('create')}
              style={{
                width: '100%', height: 64, borderRadius: 16, border: 'none', marginBottom: 14,
                background: 'linear-gradient(135deg, #f0c040, #d4a030)',
                color: '#0a0e1a', fontSize: 20, fontWeight: 900, cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(240,192,64,0.3)',
              }}
            >
              🏠 Oda Oluştur
            </button>
            <button
              onClick={() => setView('join')}
              style={{
                width: '100%', height: 64, borderRadius: 16,
                background: '#141929', border: '2px solid #3a4880',
                color: '#e8eaf6', fontSize: 20, fontWeight: 700, cursor: 'pointer',
              }}
            >
              🔗 Odaya Katıl
            </button>
          </motion.div>
        )}

        {view === 'create' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', color: '#9aa0c0', fontSize: 13, marginBottom: 8, letterSpacing: 1 }}>
                ADİN
              </label>
              <input
                type="text"
                placeholder="Oyuncu adı"
                value={name}
                maxLength={16}
                autoFocus
                onChange={e => setName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                style={{
                  width: '100%', height: 56, borderRadius: 12, border: '2px solid #2a3050',
                  background: '#141929', color: '#e8eaf6', fontSize: 18, padding: '0 16px',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', color: '#9aa0c0', fontSize: 13, marginBottom: 8, letterSpacing: 1 }}>
                HEDEF PUAN
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[100, 200, 300].map(n => (
                  <button
                    key={n}
                    onClick={() => setTargetScore(n)}
                    style={{
                      flex: 1, height: 52, borderRadius: 12, border: '2px solid',
                      borderColor: targetScore === n ? '#f0c040' : '#2a3050',
                      background: targetScore === n ? '#2a1f00' : '#141929',
                      color: targetScore === n ? '#f0c040' : '#9aa0c0',
                      fontSize: 18, fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleCreate}
              disabled={!name.trim()}
              style={{
                width: '100%', height: 60, borderRadius: 14, border: 'none',
                background: name.trim() ? 'linear-gradient(135deg, #f0c040, #d4a030)' : '#2a2a1a',
                color: name.trim() ? '#0a0e1a' : '#556', fontSize: 18, fontWeight: 800,
                cursor: name.trim() ? 'pointer' : 'default', marginBottom: 12,
              }}
            >
              Oda Oluştur →
            </button>
            <button onClick={() => { setView('home'); clearError() }}
              style={{ width: '100%', height: 48, borderRadius: 12, background: 'transparent',
                border: 'none', color: '#556', fontSize: 15, cursor: 'pointer' }}>
              ← Geri
            </button>
          </motion.div>
        )}

        {view === 'join' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', color: '#9aa0c0', fontSize: 13, marginBottom: 8, letterSpacing: 1 }}>
                ADİN
              </label>
              <input
                type="text"
                placeholder="Oyuncu adı"
                value={name}
                maxLength={16}
                autoFocus
                onChange={e => setName(e.target.value)}
                style={{
                  width: '100%', height: 56, borderRadius: 12, border: '2px solid #2a3050',
                  background: '#141929', color: '#e8eaf6', fontSize: 18, padding: '0 16px',
                  outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', color: '#9aa0c0', fontSize: 13, marginBottom: 8, letterSpacing: 1 }}>
                ODA KODU
              </label>
              <input
                type="text"
                placeholder="1234"
                value={roomCode}
                maxLength={4}
                onChange={e => setRoomCode(e.target.value.replace(/\D/g, ''))}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
                style={{
                  width: '100%', height: 72, borderRadius: 12, border: '2px solid #2a3050',
                  background: '#141929', color: '#f0c040', fontSize: 36, fontWeight: 900,
                  padding: '0 16px', outline: 'none', textAlign: 'center',
                  letterSpacing: 12, boxSizing: 'border-box',
                }}
              />
            </div>

            <button
              onClick={handleJoin}
              disabled={!name.trim() || roomCode.length < 4}
              style={{
                width: '100%', height: 60, borderRadius: 14, border: 'none',
                background: (name.trim() && roomCode.length >= 4)
                  ? 'linear-gradient(135deg, #4488ff, #2255aa)'
                  : '#141929',
                color: (name.trim() && roomCode.length >= 4) ? '#fff' : '#556',
                fontSize: 18, fontWeight: 800,
                cursor: (name.trim() && roomCode.length >= 4) ? 'pointer' : 'default',
                marginBottom: 12,
              }}
            >
              Katıl →
            </button>
            <button onClick={() => { setView('home'); clearError() }}
              style={{ width: '100%', height: 48, borderRadius: 12, background: 'transparent',
                border: 'none', color: '#556', fontSize: 15, cursor: 'pointer' }}>
              ← Geri
            </button>
          </motion.div>
        )}
      </div>
    </div>
  )
}
