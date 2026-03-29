import { calculateScore } from '../../logic/scoring.js'

export function Scoreboard({ players, currentPlayerIndex, targetScore }) {
  return (
    <div style={{
      display: 'flex',
      overflowX: 'auto',
      gap: 8,
      padding: '8px 12px',
      background: '#141929',
      WebkitOverflowScrolling: 'touch',
    }}>
      {players.map((p, i) => {
        const isActive = i === currentPlayerIndex
        const roundScore = p.busted ? 0 : calculateScore(p.hand)
        const progress = Math.min((p.totalScore / targetScore) * 100, 100)

        return (
          <div
            key={p.id}
            style={{
              minWidth: 90,
              padding: '6px 10px',
              borderRadius: 10,
              border: `2px solid ${isActive ? '#f0c040' : '#2a3050'}`,
              background: isActive ? '#1f2d4a' : '#0f1624',
              flexShrink: 0,
              position: 'relative',
            }}
          >
            {/* Progress bar */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
              background: '#2a3050', borderRadius: '0 0 8px 8px', overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${progress}%`,
                background: p.totalScore >= targetScore ? '#ff4466' : '#f0c040',
                transition: 'width 0.3s ease',
              }} />
            </div>

            <div style={{
              fontSize: 12,
              color: isActive ? '#f0c040' : '#9aa0c0',
              fontWeight: isActive ? 700 : 400,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: 80,
            }}>
              {p.name}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#e8eaf6' }}>
              {p.totalScore}
            </div>
            {roundScore > 0 && (
              <div style={{ fontSize: 11, color: '#00d4aa' }}>+{roundScore}</div>
            )}
          </div>
        )
      })}
    </div>
  )
}
