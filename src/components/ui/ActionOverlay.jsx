import { motion } from 'framer-motion'

const overlayBase = {
  position: 'fixed', inset: 0, zIndex: 50,
  background: 'rgba(0,0,0,0.7)',
  display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
  padding: 24,
  backdropFilter: 'blur(3px)',
}

const panelStyle = {
  background: '#141929',
  border: '2px solid',
  borderRadius: 20,
  padding: '28px 24px',
  width: '100%',
  maxWidth: 360,
  textAlign: 'center',
}

function PlayerButton({ player, onClick }) {
  return (
    <button
      onClick={() => onClick(player.id)}
      style={{
        display: 'block', width: '100%',
        background: '#1f2d4a', border: '2px solid #3a4880',
        borderRadius: 12, padding: '14px 20px',
        color: '#e8eaf6', fontSize: 16, fontWeight: 600,
        marginBottom: 10, cursor: 'pointer',
      }}
    >
      {player.name}
    </button>
  )
}

export function ActionOverlay({ type, players, currentPlayerIdx, onSelect, onDismiss, overlayData }) {
  if (type === 'freeze') {
    const targets = players.filter((p, i) => !p.busted && !p.stayed && !p.frozen)
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={overlayBase}>
        <div style={{ ...panelStyle, borderColor: '#4488ff' }}>
          <div style={{ fontSize: 36 }}>❄️</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#4488ff', marginBottom: 6 }}>
            DONDUR
          </div>
          <div style={{ fontSize: 14, color: '#9aa0c0', marginBottom: 20 }}>
            Hangi oyuncuyu dondurmak istiyorsun?
          </div>
          {targets.map(p => (
            <PlayerButton key={p.id} player={p} onClick={onSelect} />
          ))}
        </div>
      </motion.div>
    )
  }

  if (type === 'flipThree') {
    const targets = players.filter((p, i) => !p.busted && !p.stayed && !p.frozen)
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={overlayBase}>
        <div style={{ ...panelStyle, borderColor: '#ff4466' }}>
          <div style={{ fontSize: 36 }}>🎲</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#ff4466', marginBottom: 6 }}>
            ÜÇ ÇEK
          </div>
          <div style={{ fontSize: 14, color: '#9aa0c0', marginBottom: 20 }}>
            Kim 3 kart çekmek zorunda kalsın?
          </div>
          {targets.map(p => (
            <PlayerButton key={p.id} player={p} onClick={onSelect} />
          ))}
        </div>
      </motion.div>
    )
  }

  if (type === 'secondChance') {
    const targets = players.filter(p => !p.hasSecondChance && !p.busted && !p.stayed && !p.frozen)
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={overlayBase}>
        <div style={{ ...panelStyle, borderColor: '#00d4aa' }}>
          <div style={{ fontSize: 36 }}>🛡️</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#00d4aa', marginBottom: 6 }}>
            İKİNCİ ŞANS
          </div>
          <div style={{ fontSize: 14, color: '#9aa0c0', marginBottom: 20 }}>
            Bu kartı kime vermek istiyorsun?
          </div>
          {targets.map(p => (
            <PlayerButton key={p.id} player={p} onClick={onSelect} />
          ))}
        </div>
      </motion.div>
    )
  }

  if (type === 'modifier' && overlayData) {
    return (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        style={overlayBase}
        onClick={onDismiss}
      >
        <div style={{ ...panelStyle, borderColor: '#aa66ff' }}>
          <div style={{ fontSize: 36 }}>⭐</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#aa66ff', marginBottom: 6 }}>
            {overlayData.modifier}
          </div>
          <div style={{ fontSize: 16, color: '#e8eaf6' }}>
            {overlayData.playerName} modifier kazandı!
          </div>
          <div style={{ fontSize: 13, color: '#666', marginTop: 16 }}>Dokun, devam et</div>
        </div>
      </motion.div>
    )
  }

  return null
}
