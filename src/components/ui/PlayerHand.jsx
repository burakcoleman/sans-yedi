import { Card } from './Card.jsx'
import { calculateScore } from '../../logic/scoring.js'

export function PlayerHand({ player, isActive }) {
  const score = calculateScore(player.hand)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
      {/* Badges */}
      <div style={{ display: 'flex', gap: 8 }}>
        {player.frozen && (
          <span style={{
            background: '#0d2a4a', border: '1px solid #4488ff', color: '#4488ff',
            borderRadius: 12, padding: '2px 10px', fontSize: 13,
          }}>
            ❄️ Donduruldu
          </span>
        )}
        {player.hasSecondChance && (
          <span style={{
            background: '#0d3a1a', border: '1px solid #00d4aa', color: '#00d4aa',
            borderRadius: 12, padding: '2px 10px', fontSize: 13,
          }}>
            🛡️ İkinci Şans
          </span>
        )}
        {player.busted && (
          <span style={{
            background: '#3a0d1a', border: '1px solid #ff4466', color: '#ff4466',
            borderRadius: 12, padding: '2px 10px', fontSize: 13,
          }}>
            💥 Battı
          </span>
        )}
        {player.stayed && !player.frozen && !player.busted && (
          <span style={{
            background: '#0a2a0a', border: '1px solid #00d4aa', color: '#00d4aa',
            borderRadius: 12, padding: '2px 10px', fontSize: 13,
          }}>
            ✅ Bankaladı
          </span>
        )}
      </div>

      {/* Cards */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        justifyContent: 'center',
        minHeight: 76,
        padding: '8px 0',
      }}>
        {player.hand.length === 0 ? (
          <span style={{ color: '#555', fontSize: 14, alignSelf: 'center' }}>Henüz kart yok</span>
        ) : (
          player.hand.map((card, i) => (
            <Card key={card.id} card={card} animate={isActive && i === player.hand.length - 1} />
          ))
        )}
      </div>

      {/* Score */}
      {player.hand.length > 0 && (
        <div style={{ color: '#f0c040', fontSize: 15, fontWeight: 600 }}>
          Bu tur: {player.busted ? '0' : score} puan
        </div>
      )}
    </div>
  )
}
