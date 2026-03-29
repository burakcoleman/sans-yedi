import { motion, AnimatePresence } from 'framer-motion'
import { useSocketStore } from '../../store/socketStore.js'
import { Card } from '../ui/Card.jsx'
import { BustOverlay } from '../ui/BustOverlay.jsx'
import { ActionOverlay } from '../ui/ActionOverlay.jsx'
import { Confetti } from '../ui/Confetti.jsx'
import { Toast } from '../ui/Toast.jsx'
import { calculateScore } from '../../logic/scoring.js'
import { FLIP7_BONUS } from '../../logic/scoring.js'
import { CARD_TYPE } from '../../logic/deck.js'

export function GameScreen() {
  const {
    myPlayerId, myHand, allPlayers, currentPlayerId,
    targetScore, deckCount, round, log,
    pendingAction, showOverlay, overlayData,
    toasts, phase,
    hit, stay, selectActionTarget, dismissOverlay, nextRound,
    isHost,
  } = useSocketStore()

  const isMyTurn = currentPlayerId === myPlayerId
  const myPlayer = allPlayers.find(p => p.id === myPlayerId)
  const opponents = allPlayers.filter(p => p.id !== myPlayerId)
  const myRoundScore = calculateScore(myHand)
  const isRoundEnd = phase === 'roundEnd'
  const roundScores = useSocketStore(s => s.roundScores)

  const canAct = isMyTurn && !pendingAction && !showOverlay && !isRoundEnd
    && myPlayer && !myPlayer.busted && !myPlayer.stayed && !myPlayer.frozen

  return (
    <div style={{
      minHeight: '100dvh', background: '#0a0e1a',
      display: 'flex', flexDirection: 'column',
    }}>
      <Confetti active={showOverlay === 'flip7'} />

      {/* Toasts */}
      <div style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 70, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
        <AnimatePresence>
          {toasts.map(t => <Toast key={t.id} toast={t} />)}
        </AnimatePresence>
      </div>

      {/* Top: Opponents */}
      <div style={{ background: '#0d1220', padding: '8px 12px' }}>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 2 }}>
          {opponents.map(p => (
            <OpponentCard key={p.id} player={p} isTurn={p.id === currentPlayerId} />
          ))}
        </div>
      </div>

      {/* Round + deck info */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        padding: '5px 14px', background: '#0a0e1a',
        fontSize: 12, color: '#445',
      }}>
        <span>Tur {round} • Hedef: {targetScore}</span>
        <span>🃏 {deckCount} kart</span>
      </div>

      {/* My area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 14px' }}>
        {/* My turn indicator */}
        <div style={{ textAlign: 'center', padding: '10px 0 6px' }}>
          {isMyTurn && !isRoundEnd ? (
            <motion.div
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{ color: '#f0c040', fontWeight: 800, fontSize: 16 }}
            >
              🎯 Sıra sende!
            </motion.div>
          ) : isRoundEnd ? null : (
            <div style={{ color: '#445', fontSize: 14 }}>
              {allPlayers.find(p => p.id === currentPlayerId)?.name || '...'} oynuyor
            </div>
          )}
        </div>

        {/* My status badges */}
        {myPlayer && (
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 8 }}>
            {myPlayer.frozen && <Badge color="#4488ff" label="❄️ Donduruldun" />}
            {myPlayer.hasSecondChance && <Badge color="#00d4aa" label="🛡️ İkinci Şans" />}
            {myPlayer.busted && <Badge color="#ff4466" label="💥 Battın" />}
            {myPlayer.stayed && !myPlayer.frozen && !myPlayer.busted && <Badge color="#00d4aa" label="✅ Bankaladın" />}
          </div>
        )}

        {/* My hand */}
        <div style={{
          background: '#141929', borderRadius: 14,
          border: `2px solid ${isMyTurn ? '#f0c040' : '#1f2d4a'}`,
          padding: '14px', marginBottom: 10, flex: 1,
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ fontSize: 12, color: '#556', marginBottom: 8 }}>
            Elindeki kartlar
            {myHand.length > 0 && !myPlayer?.busted && (
              <span style={{ color: '#f0c040', marginLeft: 8 }}>
                {myRoundScore} puan
              </span>
            )}
            {myPlayer?.busted && <span style={{ color: '#ff4466', marginLeft: 8 }}>0 puan (battı)</span>}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-start' }}>
            {myHand.length === 0 ? (
              <span style={{ color: '#333', fontSize: 13, alignSelf: 'center' }}>Henüz kart yok</span>
            ) : (
              myHand.map((card, i) => (
                <motion.div
                  key={card.id}
                  initial={i === myHand.length - 1 ? { scale: 0, rotate: -15 } : false}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <Card card={card} />
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* My score bar */}
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          padding: '8px 12px', background: '#141929', borderRadius: 10, marginBottom: 8,
          fontSize: 13,
        }}>
          <span style={{ color: '#9aa0c0' }}>Toplam: <strong style={{ color: '#e8eaf6' }}>{myPlayer?.totalScore ?? 0}</strong></span>
          <span style={{ color: '#9aa0c0' }}>Bu tur: <strong style={{ color: '#f0c040' }}>{myPlayer?.busted ? 0 : myRoundScore}</strong></span>
        </div>
      </div>

      {/* Log */}
      <div style={{
        padding: '7px 14px', background: '#0d1220',
        fontSize: 13, color: '#778', minHeight: 32, textAlign: 'center',
      }}>
        {log}
      </div>

      {/* Action buttons */}
      {!isRoundEnd && !showOverlay && !pendingAction && (
        <div style={{
          display: 'flex', gap: 10, padding: '10px 14px',
          paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
          background: '#0a0e1a',
        }}>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={hit}
            disabled={!canAct}
            style={{
              flex: 1, height: 64, borderRadius: 16,
              background: canAct ? 'linear-gradient(135deg, #1a3a6a, #2255aa)' : '#141929',
              border: `2px solid ${canAct ? '#4488ff' : '#1f2d4a'}`,
              color: canAct ? '#fff' : '#334',
              fontSize: 17, fontWeight: 800, cursor: canAct ? 'pointer' : 'default',
            }}
          >
            🎴 KART ÇEK
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={stay}
            disabled={!canAct}
            style={{
              flex: 1, height: 64, borderRadius: 16,
              background: canAct ? 'linear-gradient(135deg, #0a2a1a, #1a5a2a)' : '#141929',
              border: `2px solid ${canAct ? '#00d4aa' : '#1f2d4a'}`,
              color: canAct ? '#00d4aa' : '#334',
              fontSize: 17, fontWeight: 800, cursor: canAct ? 'pointer' : 'default',
            }}
          >
            💰 BANKALA
          </motion.button>
        </div>
      )}

      {/* Next round (host only) */}
      {isRoundEnd && !showOverlay && (
        <div style={{
          padding: '10px 14px',
          paddingBottom: 'max(10px, env(safe-area-inset-bottom))',
          background: '#0a0e1a',
        }}>
          {isHost ? (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={nextRound}
              style={{
                width: '100%', height: 64, borderRadius: 16, border: 'none',
                background: 'linear-gradient(135deg, #f0c040, #d4a030)',
                color: '#0a0e1a', fontSize: 20, fontWeight: 900, cursor: 'pointer',
              }}
            >
              ▶ Sonraki Tur
            </motion.button>
          ) : (
            <div style={{ textAlign: 'center', color: '#556', fontSize: 14 }}>
              Host sonraki turu başlatmayı bekliyor...
            </div>
          )}
          {/* Round summary */}
          {roundScores.length > 0 && (
            <div style={{ marginTop: 12, background: '#141929', borderRadius: 12, padding: 14 }}>
              <div style={{ fontWeight: 700, color: '#f0c040', marginBottom: 8, fontSize: 13 }}>Tur Özeti</div>
              {[...roundScores].sort((a, b) => b.roundScore - a.roundScore).map(p => (
                <div key={p.id} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '6px 0', borderBottom: '1px solid #1f2d4a',
                  fontSize: 14,
                }}>
                  <span style={{ color: '#e8eaf6' }}>{p.name}</span>
                  <span style={{ color: p.busted ? '#ff4466' : '#00d4aa', fontWeight: 700 }}>
                    {p.busted ? '💥 0' : `+${p.roundScore}`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action target selection overlay */}
      {pendingAction && (
        <ActionOverlay
          type={pendingAction.actionType === 'freeze' ? 'freeze' : pendingAction.actionType === 'flipThree' ? 'flipThree' : 'secondChance'}
          players={pendingAction.eligibleTargets.map(t => ({ ...t, busted: false, stayed: false, frozen: false }))}
          onSelect={id => selectActionTarget(id)}
          onDismiss={() => {}}
          overlayData={null}
        />
      )}

      {/* Overlays */}
      <AnimatePresence>
        {showOverlay === 'bust' && (
          <BustOverlay
            key="bust"
            playerName="Sen"
            onDismiss={dismissOverlay}
          />
        )}
        {showOverlay === 'flip7' && overlayData && (
          <Flip7Overlay
            key="flip7"
            playerName={overlayData.playerName}
            isMe={overlayData.playerId === myPlayerId}
            onDismiss={dismissOverlay}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function OpponentCard({ player, isTurn }) {
  return (
    <div style={{
      minWidth: 90, padding: '8px 10px',
      background: isTurn ? '#1f2d4a' : '#0f1624',
      border: `2px solid ${isTurn ? '#f0c040' : '#2a3050'}`,
      borderRadius: 12, flexShrink: 0,
      opacity: player.connected === false ? 0.5 : 1,
    }}>
      <div style={{
        fontSize: 12, fontWeight: isTurn ? 700 : 400,
        color: isTurn ? '#f0c040' : '#9aa0c0',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 80,
      }}>
        {player.name}
        {isTurn && ' 🎯'}
      </div>
      <div style={{ fontSize: 17, fontWeight: 700, color: '#e8eaf6', margin: '2px 0' }}>
        {player.totalScore}
      </div>
      {/* Face-down cards */}
      <div style={{ display: 'flex', gap: 3, marginTop: 4 }}>
        {Array.from({ length: Math.min(player.cardCount, 7) }).map((_, i) => (
          <div key={i} style={{
            width: 14, height: 20, borderRadius: 3,
            background: 'linear-gradient(135deg, #1a2a5a, #2a3a7a)',
            border: '1px solid #4488ff40',
            flexShrink: 0,
          }} />
        ))}
        {player.cardCount > 7 && (
          <span style={{ color: '#556', fontSize: 10, alignSelf: 'center' }}>+{player.cardCount - 7}</span>
        )}
      </div>
      {/* Status badges */}
      <div style={{ marginTop: 3 }}>
        {player.frozen && <span style={{ fontSize: 10, color: '#4488ff' }}>❄️</span>}
        {player.stayed && !player.frozen && !player.busted && <span style={{ fontSize: 10, color: '#00d4aa' }}>✅</span>}
        {player.busted && <span style={{ fontSize: 10, color: '#ff4466' }}>💥</span>}
        {player.hasSecondChance && <span style={{ fontSize: 10, color: '#00d4aa' }}>🛡️</span>}
        {player.connected === false && <span style={{ fontSize: 10, color: '#445' }}> 📴</span>}
      </div>
    </div>
  )
}

function Badge({ color, label }) {
  return (
    <span style={{
      background: color + '22', border: `1px solid ${color}`,
      color, borderRadius: 10, padding: '2px 8px', fontSize: 12,
    }}>
      {label}
    </span>
  )
}

function Flip7Overlay({ playerName, isMe, onDismiss }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(10,5,0,0.88)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onDismiss}
    >
      <motion.div
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 0.7, repeat: 2 }}
        style={{
          background: '#1a1200', border: '3px solid #f0c040',
          borderRadius: 24, padding: '36px 40px', textAlign: 'center',
          boxShadow: '0 0 60px rgba(240,192,64,0.4)',
        }}
      >
        <div style={{ fontSize: 52 }}>🌟</div>
        <div style={{ fontSize: 30, fontWeight: 900, color: '#f0c040', marginTop: 8 }}>
          {isMe ? 'ŞANS YEDİ YAPTIN!' : 'ŞANS YEDİ!'}
        </div>
        <div style={{ fontSize: 18, color: '#e8eaf6', marginTop: 6 }}>{playerName}</div>
        <div style={{ fontSize: 20, color: '#aa66ff', fontWeight: 700, marginTop: 8 }}>
          +{FLIP7_BONUS} BONUS PUAN!
        </div>
        <div style={{ fontSize: 13, color: '#556', marginTop: 16 }}>Dokun, devam et</div>
      </motion.div>
    </motion.div>
  )
}
