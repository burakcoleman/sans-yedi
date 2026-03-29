import { motion } from 'framer-motion'
import { useSocketStore } from '../../store/socketStore.js'

export function LobbyScreen() {
  const { roomCode, myPlayerId, lobbyPlayers, isHost, startGame, leaveRoom } = useSocketStore()

  const copyCode = () => {
    navigator.clipboard?.writeText(roomCode)
  }

  return (
    <div style={{
      minHeight: '100dvh', background: '#0a0e1a',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'flex-start',
      padding: '40px 20px',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div style={{ color: '#9aa0c0', fontSize: 13, letterSpacing: 2, marginBottom: 8 }}>
          ODA KODU
        </div>
        <motion.div
          whileTap={{ scale: 0.95 }}
          onClick={copyCode}
          style={{
            fontSize: 52, fontWeight: 900, color: '#f0c040', cursor: 'pointer',
            letterSpacing: 10, background: '#141929',
            border: '2px solid #f0c040', borderRadius: 16, padding: '12px 28px',
            display: 'inline-block',
          }}
        >
          {roomCode}
        </motion.div>
        <div style={{ color: '#445', fontSize: 12, marginTop: 8 }}>
          Arkadaşlarına bu kodu gönder • Kopyalamak için dokun
        </div>
      </div>

      {/* Players */}
      <div style={{ width: '100%', maxWidth: 380, marginBottom: 32 }}>
        <div style={{ color: '#9aa0c0', fontSize: 13, letterSpacing: 1, marginBottom: 12 }}>
          OYUNCULAR ({lobbyPlayers.length}/6)
        </div>
        {lobbyPlayers.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 14px', marginBottom: 8,
              background: '#141929', borderRadius: 12,
              border: `2px solid ${p.id === myPlayerId ? '#f0c040' : '#2a3050'}`,
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: p.id === myPlayerId ? '#2a1f00' : '#1a2240',
              border: `2px solid ${p.id === myPlayerId ? '#f0c040' : '#3a4880'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#f0c040', fontWeight: 700,
            }}>
              {i + 1}
            </div>
            <span style={{
              flex: 1, fontWeight: p.id === myPlayerId ? 700 : 400,
              color: p.connected === false ? '#445' : '#e8eaf6',
            }}>
              {p.name}
              {p.id === myPlayerId && <span style={{ color: '#f0c040', fontSize: 12 }}> (sen)</span>}
              {i === 0 && <span style={{ color: '#9aa0c0', fontSize: 12 }}> 👑 host</span>}
            </span>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: p.connected === false ? '#445' : '#00d4aa',
            }} />
          </motion.div>
        ))}

        {lobbyPlayers.length < 2 && (
          <div style={{ color: '#445', fontSize: 13, textAlign: 'center', marginTop: 8 }}>
            En az 2 oyuncu gerekli...
          </div>
        )}
      </div>

      {/* Buttons */}
      {isHost ? (
        <div style={{ width: '100%', maxWidth: 380 }}>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={startGame}
            disabled={lobbyPlayers.length < 2}
            style={{
              width: '100%', height: 64, borderRadius: 16, border: 'none',
              background: lobbyPlayers.length >= 2
                ? 'linear-gradient(135deg, #f0c040, #d4a030)' : '#1a1a0a',
              color: lobbyPlayers.length >= 2 ? '#0a0e1a' : '#445',
              fontSize: 20, fontWeight: 900,
              cursor: lobbyPlayers.length >= 2 ? 'pointer' : 'default',
              marginBottom: 12,
            }}
          >
            🎮 Oyunu Başlat
          </motion.button>
          <button
            onClick={leaveRoom}
            style={{
              width: '100%', height: 48, borderRadius: 12,
              background: 'transparent', border: 'none',
              color: '#445', fontSize: 15, cursor: 'pointer',
            }}
          >
            Odadan Ayrıl
          </button>
        </div>
      ) : (
        <div style={{ textAlign: 'center' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, color: '#9aa0c0',
          }}>
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              ⏳
            </motion.div>
            Host oyunu başlatmasını bekliyor...
          </div>
          <button
            onClick={leaveRoom}
            style={{
              marginTop: 20, height: 44, padding: '0 24px', borderRadius: 10,
              background: 'transparent', border: 'none',
              color: '#445', fontSize: 14, cursor: 'pointer',
            }}
          >
            Odadan Ayrıl
          </button>
        </div>
      )}
    </div>
  )
}
