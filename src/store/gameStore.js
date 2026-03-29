import { create } from 'zustand'
import { buildDeck, shuffleDeck, CARD_TYPE, ACTION } from '../logic/deck.js'
import {
  checkBust,
  checkFlip7,
  drawCard,
  nextActivePlayerIndex,
  isRoundOver,
  applyFreeze,
  applySecondChance,
  useSecondChance,
  finalizeRoundScores,
  resetPlayersForRound,
  countActivePlayers,
} from '../logic/gameEngine.js'
import { calculateScore } from '../logic/scoring.js'

const INITIAL_STATE = {
  players: [],
  targetScore: 200,
  deck: [],
  usedCardsPile: [],    // cards moved aside at end of round
  discardPile: [],      // cards discarded mid-round (action cards etc.)
  currentPlayerIndex: 0,
  dealerIndex: 0,
  round: 1,
  phase: 'setup',      // setup | dealing | playing | roundEnd | gameEnd
  log: '',
  // pending action from an action card that was just played
  pendingAction: null,   // { type: ACTION.*, fromPlayerIdx, card }
  // overlay to show
  showOverlay: null,    // null | 'bust' | 'flip7' | 'freeze' | 'flipThree' | 'secondChance' | 'modifier' | 'roundEnd'
  overlayData: null,    // extra data for overlay rendering
  flip7WinnerIdx: -1,
  // For FlipThree state
  flipThreeState: null, // { targetIdx, cardsLeft, queuedActions }
}

export const useGameStore = create((set, get) => ({
  ...INITIAL_STATE,

  // ─── SETUP ───────────────────────────────────────────────────────────────

  setPlayerNames(names, targetScore) {
    const players = names.map((name, i) => ({
      id: i,
      name: name || `Oyuncu ${i + 1}`,
      totalScore: 0,
      roundScore: 0,
      hand: [],
      frozen: false,
      stayed: false,
      busted: false,
      hasSecondChance: false,
      secondChanceCard: null,
    }))
    set({ players, targetScore })
  },

  startGame() {
    const { players, dealerIndex } = get()
    const freshDeck = shuffleDeck(buildDeck())
    const resetPlayers = players.map(p => ({
      ...p,
      hand: [],
      roundScore: 0,
      frozen: false,
      stayed: false,
      busted: false,
      hasSecondChance: false,
      secondChanceCard: null,
    }))
    set({
      deck: freshDeck,
      usedCardsPile: [],
      discardPile: [],
      players: resetPlayers,
      phase: 'dealing',
      round: 1,
      dealerIndex,
      currentPlayerIndex: dealerIndex,
      log: 'Kartlar dağıtılıyor...',
      showOverlay: null,
      pendingAction: null,
      flip7WinnerIdx: -1,
      flipThreeState: null,
    })
    // Start dealing
    get().dealNextCard(0)
  },

  // ─── DEALING ──────────────────────────────────────────────────────────────
  // Deal one card to each player in order; handle action cards immediately

  dealNextCard(dealToIdx) {
    const { players, deck, usedCardsPile, discardPile, dealerIndex } = get()
    const totalPlayers = players.length

    // If we've dealt one card to everyone, move to playing phase
    if (dealToIdx >= totalPlayers) {
      const startIdx = (dealerIndex + 1) % totalPlayers
      set({ phase: 'playing', currentPlayerIndex: startIdx, log: `${players[startIdx].name}'in sırası.` })
      return
    }

    const { card, newDeck, newUsedPile } = drawCard(deck, usedCardsPile)
    if (!card) {
      set({ phase: 'playing', log: 'Deste bitti!' })
      return
    }

    if (card.type === CARD_TYPE.NUMBER || card.type === CARD_TYPE.MODIFIER) {
      // Give card to dealToIdx player
      const newPlayers = players.map((p, i) =>
        i === dealToIdx ? { ...p, hand: [...p.hand, card] } : p
      )
      set({ players: newPlayers, deck: newDeck, usedCardsPile: newUsedPile })
      // Continue dealing to next player
      get().dealNextCard(dealToIdx + 1)
    } else {
      // Action card during dealing — resolve immediately
      set({ deck: newDeck, usedCardsPile: newUsedPile })
      get().resolveDealActionCard(card, dealToIdx, totalPlayers)
    }
  },

  resolveDealActionCard(card, dealToIdx, totalPlayers) {
    const { players, deck, usedCardsPile, discardPile } = get()

    if (card.action === ACTION.FREEZE) {
      // Freeze the player being dealt to — they bank 0 (no cards yet) and skip this round
      const newPlayers = applyFreeze(players, dealToIdx)
      set({
        players: newPlayers,
        discardPile: [...discardPile, card],
        log: `${players[dealToIdx].name} donduruldu! (Dağıtım sırasında)`,
      })
      get().dealNextCard(dealToIdx + 1)
    } else if (card.action === ACTION.SECOND_CHANCE) {
      // Give Second Chance to this player (if they don't have one already)
      const target = players[dealToIdx]
      if (!target.hasSecondChance) {
        const newPlayers = applySecondChance(players, dealToIdx, card)
        set({
          players: newPlayers,
          log: `${target.name} İkinci Şans kazandı!`,
        })
        get().dealNextCard(dealToIdx + 1)
      } else {
        // Player already has one — give to next active player who doesn't have it
        const altIdx = players.findIndex((p, i) => i !== dealToIdx && !p.hasSecondChance && !p.frozen && !p.busted)
        if (altIdx >= 0) {
          const newPlayers = applySecondChance(players, altIdx, card)
          set({
            players: newPlayers,
            log: `${players[altIdx].name} İkinci Şans kazandı!`,
          })
        } else {
          set({ discardPile: [...discardPile, card] })
        }
        get().dealNextCard(dealToIdx + 1)
      }
    } else if (card.action === ACTION.FLIP_THREE) {
      // During dealing, Flip Three → deal 3 extra cards to this player, then continue
      get().dealFlipThreeDuringDeal(card, dealToIdx, 3)
    }
  },

  dealFlipThreeDuringDeal(flipCard, targetIdx, remaining) {
    const { players, deck, usedCardsPile, discardPile } = get()
    if (remaining === 0) {
      set({ discardPile: [...discardPile, flipCard] })
      get().dealNextCard(targetIdx + 1)
      return
    }
    const { card, newDeck, newUsedPile } = drawCard(deck, usedCardsPile)
    if (!card) {
      set({ discardPile: [...discardPile, flipCard] })
      get().dealNextCard(targetIdx + 1)
      return
    }
    if (card.type === CARD_TYPE.NUMBER) {
      const target = players[targetIdx]
      if (checkBust([...target.hand, card])) {
        // Bust — discard cards, mark busted
        const newPlayers = players.map((p, i) =>
          i === targetIdx ? { ...p, busted: true, stayed: true } : p
        )
        set({
          players: newPlayers,
          deck: newDeck,
          usedCardsPile: newUsedPile,
          discardPile: [...discardPile, flipCard, card],
          log: `${target.name} Üç Çek'te battı!`,
        })
        get().dealNextCard(targetIdx + 1)
        return
      }
      const newPlayers = players.map((p, i) =>
        i === targetIdx ? { ...p, hand: [...p.hand, card] } : p
      )
      set({ players: newPlayers, deck: newDeck, usedCardsPile: newUsedPile })
      get().dealFlipThreeDuringDeal(flipCard, targetIdx, remaining - 1)
    } else {
      // Non-number card during FlipThree in deal — just discard and continue
      set({
        deck: newDeck,
        usedCardsPile: newUsedPile,
        discardPile: [...discardPile, card],
      })
      get().dealFlipThreeDuringDeal(flipCard, targetIdx, remaining - 1)
    }
  },

  // ─── PLAYING ──────────────────────────────────────────────────────────────

  hitCard() {
    const { players, deck, usedCardsPile, discardPile, currentPlayerIndex, flipThreeState } = get()
    const playerIdx = flipThreeState ? flipThreeState.targetIdx : currentPlayerIndex
    const player = players[playerIdx]

    const { card, newDeck, newUsedPile } = drawCard(deck, usedCardsPile)
    if (!card) {
      set({ log: 'Deste tamamen bitti!' })
      return
    }

    set({ deck: newDeck, usedCardsPile: newUsedPile })
    get().processDrawnCard(card, playerIdx)
  },

  processDrawnCard(card, playerIdx) {
    const { players, discardPile, flipThreeState } = get()
    const player = players[playerIdx]

    if (card.type === CARD_TYPE.NUMBER) {
      const newHand = [...player.hand, card]

      // Check Second Chance before bust
      if (checkBust(newHand) && player.hasSecondChance) {
        const updatedPlayer = useSecondChance(player, card)
        const newPlayers = players.map((p, i) => i === playerIdx ? updatedPlayer : p)
        set({
          players: newPlayers,
          log: `${player.name} İkinci Şans kullandı! Kurtuldu.`,
        })
        get().afterCardProcessed(playerIdx)
        return
      }

      if (checkBust(newHand)) {
        // BUST
        const newPlayers = players.map((p, i) =>
          i === playerIdx ? { ...p, hand: newHand, busted: true, stayed: true, roundScore: 0 } : p
        )
        set({
          players: newPlayers,
          showOverlay: 'bust',
          overlayData: { playerName: player.name },
          log: `${player.name} battı! 0 puan.`,
        })
        return
      }

      if (checkFlip7(newHand)) {
        // FLIP 7!
        const newPlayers = players.map((p, i) =>
          i === playerIdx ? { ...p, hand: newHand } : p
        )
        set({
          players: newPlayers,
          flip7WinnerIdx: playerIdx,
          log: `🌟 ${player.name} ŞANS YEDİ yaptı!`,
        })
        get().endRound(playerIdx)
        return
      }

      const newPlayers = players.map((p, i) =>
        i === playerIdx ? { ...p, hand: newHand } : p
      )
      set({
        players: newPlayers,
        log: `${player.name} ${card.value} çekti.`,
      })
      get().afterCardProcessed(playerIdx)

    } else if (card.type === CARD_TYPE.MODIFIER) {
      const newPlayers = players.map((p, i) =>
        i === playerIdx ? { ...p, hand: [...p.hand, card] } : p
      )
      const label = card.modifier === 'x2' ? '×2' : card.modifier
      set({
        players: newPlayers,
        showOverlay: 'modifier',
        overlayData: { playerName: player.name, modifier: label },
        log: `${player.name} ${label} modifier çekti.`,
      })
      // Overlay dismisses via dismissOverlay(), which calls afterCardProcessed

    } else if (card.type === CARD_TYPE.ACTION) {
      set({
        pendingAction: { type: card.action, fromPlayerIdx: playerIdx, card },
        discardPile: [...discardPile, card],
      })
      if (card.action === ACTION.FREEZE) {
        const activeTargets = players.filter((p, i) => i !== playerIdx && !p.busted && !p.stayed && !p.frozen)
        if (activeTargets.length === 0) {
          // Only active player — freeze self
          get().selectActionTarget(playerIdx)
        } else {
          set({ showOverlay: 'freeze', log: `${player.name} Dondur kartı çekti. Hedef seç.` })
        }
      } else if (card.action === ACTION.FLIP_THREE) {
        const activeTargets = players.filter((p, i) => i !== playerIdx && !p.busted && !p.stayed && !p.frozen)
        if (activeTargets.length === 0) {
          get().selectActionTarget(playerIdx)
        } else {
          set({ showOverlay: 'flipThree', log: `${player.name} Üç Çek kartı çekti. Hedef seç.` })
        }
      } else if (card.action === ACTION.SECOND_CHANCE) {
        // Give to current player if they don't have it, else pick target
        if (!player.hasSecondChance) {
          get().selectActionTarget(playerIdx)
        } else {
          const altTargets = players.filter((p, i) => !p.hasSecondChance && !p.busted && !p.stayed && !p.frozen)
          if (altTargets.length === 0) {
            set({ discardPile: [...discardPile, card], log: `${player.name} İkinci Şans çekti ama kimse alamadı.` })
            get().afterCardProcessed(playerIdx)
          } else if (altTargets.length === 1) {
            get().selectActionTarget(altTargets[0].id)
          } else {
            set({ showOverlay: 'secondChance', log: `${player.name} İkinci Şans kartı çekti. Hedef seç.` })
          }
        }
      }
    }
  },

  selectActionTarget(targetId) {
    const { pendingAction, players, discardPile, flipThreeState } = get()
    if (!pendingAction) return

    const targetIdx = players.findIndex(p => p.id === targetId)
    const target = players[targetIdx]
    const from = players[pendingAction.fromPlayerIdx]

    if (pendingAction.type === ACTION.FREEZE) {
      const newPlayers = applyFreeze(players, targetIdx)
      set({
        players: newPlayers,
        showOverlay: null,
        pendingAction: null,
        log: `${from.name}, ${target.name}'i dondurdu!`,
      })
      get().afterCardProcessed(pendingAction.fromPlayerIdx)

    } else if (pendingAction.type === ACTION.FLIP_THREE) {
      set({
        showOverlay: null,
        pendingAction: null,
        flipThreeState: { targetIdx, cardsLeft: 3, queuedActions: [] },
        log: `${from.name}, ${target.name}'e Üç Çek uyguladı!`,
      })
      get().drawFlipThreeCard()

    } else if (pendingAction.type === ACTION.SECOND_CHANCE) {
      const updatedPlayers = applySecondChance(players, targetIdx, pendingAction.card)
      set({
        players: updatedPlayers,
        showOverlay: null,
        pendingAction: null,
        log: `${target.name} İkinci Şans kazandı!`,
      })
      get().afterCardProcessed(pendingAction.fromPlayerIdx)
    }
  },

  drawFlipThreeCard() {
    const { players, deck, usedCardsPile, discardPile, flipThreeState, currentPlayerIndex } = get()
    if (!flipThreeState) return

    const { targetIdx, cardsLeft, queuedActions } = flipThreeState
    const target = players[targetIdx]

    if (cardsLeft === 0) {
      // All 3 cards drawn — now resolve any queued actions in order
      set({ flipThreeState: null })
      if (queuedActions.length > 0) {
        const [firstAction, ...rest] = queuedActions
        set({ pendingAction: firstAction })
        // Re-trigger action resolution
        get().triggerQueuedAction(firstAction, rest)
      } else {
        get().afterCardProcessed(currentPlayerIndex)
      }
      return
    }

    const { card, newDeck, newUsedPile } = drawCard(deck, usedCardsPile)
    if (!card) {
      set({ flipThreeState: null })
      get().afterCardProcessed(currentPlayerIndex)
      return
    }

    set({ deck: newDeck, usedCardsPile: newUsedPile })

    if (card.type === CARD_TYPE.NUMBER) {
      const newHand = [...target.hand, card]

      if (checkBust(newHand) && target.hasSecondChance) {
        const updatedTarget = useSecondChance(target, card)
        const newPlayers = players.map((p, i) => i === targetIdx ? updatedTarget : p)
        set({
          players: newPlayers,
          flipThreeState: { ...flipThreeState, cardsLeft: cardsLeft - 1 },
          log: `${target.name} İkinci Şans kullandı!`,
        })
        get().drawFlipThreeCard()
        return
      }

      if (checkBust(newHand)) {
        const newPlayers = players.map((p, i) =>
          i === targetIdx ? { ...p, hand: newHand, busted: true, stayed: true, roundScore: 0 } : p
        )
        set({
          players: newPlayers,
          flipThreeState: null,
          showOverlay: 'bust',
          overlayData: { playerName: target.name },
          log: `${target.name} Üç Çek'te battı!`,
        })
        return
      }

      if (checkFlip7(newHand)) {
        const newPlayers = players.map((p, i) =>
          i === targetIdx ? { ...p, hand: newHand } : p
        )
        set({
          players: newPlayers,
          flip7WinnerIdx: targetIdx,
          flipThreeState: null,
        })
        get().endRound(targetIdx)
        return
      }

      const newPlayers = players.map((p, i) =>
        i === targetIdx ? { ...p, hand: newHand } : p
      )
      set({
        players: newPlayers,
        flipThreeState: { ...flipThreeState, cardsLeft: cardsLeft - 1 },
        log: `${target.name} ${card.value} çekti (Üç Çek: ${3 - cardsLeft + 1}/3).`,
      })
      get().drawFlipThreeCard()

    } else if (card.type === CARD_TYPE.MODIFIER) {
      const newPlayers = players.map((p, i) =>
        i === targetIdx ? { ...p, hand: [...p.hand, card] } : p
      )
      set({
        players: newPlayers,
        flipThreeState: { ...flipThreeState, cardsLeft: cardsLeft - 1 },
        log: `${target.name} ${card.modifier} modifier çekti (Üç Çek).`,
      })
      get().drawFlipThreeCard()

    } else if (card.type === CARD_TYPE.ACTION) {
      // Queue action to be resolved after FlipThree finishes
      const newQueued = [...queuedActions, { type: card.action, fromPlayerIdx: targetIdx, card }]
      set({
        discardPile: [...discardPile, card],
        flipThreeState: { ...flipThreeState, cardsLeft: cardsLeft - 1, queuedActions: newQueued },
        log: `${target.name} aksiyon kartı çekti (Üç Çek). Sonra çözümlenecek.`,
      })
      get().drawFlipThreeCard()
    }
  },

  triggerQueuedAction(action, remaining) {
    const { players } = get()
    const fromPlayer = players[action.fromPlayerIdx]

    set({ pendingAction: action })

    if (action.type === ACTION.FREEZE) {
      const activeTargets = players.filter((p, i) => i !== action.fromPlayerIdx && !p.busted && !p.stayed && !p.frozen)
      if (activeTargets.length === 0) {
        get().selectActionTarget(fromPlayer.id)
      } else {
        set({ showOverlay: 'freeze' })
      }
    } else if (action.type === ACTION.FLIP_THREE) {
      const activeTargets = players.filter((p, i) => i !== action.fromPlayerIdx && !p.busted && !p.stayed && !p.frozen)
      if (activeTargets.length === 0) {
        get().selectActionTarget(fromPlayer.id)
      } else {
        set({ showOverlay: 'flipThree' })
      }
    } else if (action.type === ACTION.SECOND_CHANCE) {
      if (!fromPlayer.hasSecondChance) {
        get().selectActionTarget(fromPlayer.id)
      } else {
        const altTargets = players.filter((p, i) => !p.hasSecondChance && !p.busted && !p.stayed && !p.frozen)
        if (altTargets.length === 0) {
          set({ pendingAction: null })
          get().afterCardProcessed(get().currentPlayerIndex)
        } else if (altTargets.length === 1) {
          get().selectActionTarget(altTargets[0].id)
        } else {
          set({ showOverlay: 'secondChance' })
        }
      }
    }
  },

  stayCard() {
    const { players, currentPlayerIndex } = get()
    const player = players[currentPlayerIndex]
    const roundScore = calculateScore(player.hand)
    const newPlayers = players.map((p, i) =>
      i === currentPlayerIndex ? { ...p, stayed: true, roundScore } : p
    )
    set({
      players: newPlayers,
      log: `${player.name} durdu. ${roundScore} puan bankalandı.`,
    })
    get().advanceTurn()
  },

  afterCardProcessed(fromPlayerIdx) {
    const { players, flipThreeState } = get()
    // If it was a FlipThree, the turn stays on the original player
    if (isRoundOver(players)) {
      get().endRound(-1)
    } else {
      get().advanceTurn()
    }
  },

  advanceTurn() {
    const { players, currentPlayerIndex } = get()
    if (isRoundOver(players)) {
      get().endRound(-1)
      return
    }
    const next = nextActivePlayerIndex(players, currentPlayerIndex)
    if (next === -1) {
      get().endRound(-1)
      return
    }
    set({ currentPlayerIndex: next, log: `${players[next].name}'in sırası.` })
  },

  dismissOverlay() {
    const { showOverlay, currentPlayerIndex, players } = get()
    set({ showOverlay: null, overlayData: null })

    if (showOverlay === 'bust') {
      if (isRoundOver(players)) {
        get().endRound(-1)
      } else {
        get().advanceTurn()
      }
    } else if (showOverlay === 'modifier') {
      get().afterCardProcessed(currentPlayerIndex)
    } else if (showOverlay === 'flip7' || showOverlay === 'roundEnd') {
      // Round end overlays dismissed by user — game screen shows next round button
    }
  },

  // ─── ROUND END ────────────────────────────────────────────────────────────

  endRound(flip7WinnerIdx) {
    const { players, usedCardsPile, discardPile } = get()

    // Move all cards from hands and discard into usedCardsPile for this round
    const cardsFromHands = players.flatMap(p => p.hand)
    const newUsedPile = [...usedCardsPile, ...discardPile, ...cardsFromHands]

    const finalized = finalizeRoundScores(players, flip7WinnerIdx)

    const showFlip7 = flip7WinnerIdx >= 0

    set({
      players: finalized,
      usedCardsPile: newUsedPile,
      discardPile: [],
      flip7WinnerIdx,
      phase: 'roundEnd',
      showOverlay: showFlip7 ? 'flip7' : 'roundEnd',
      overlayData: showFlip7 ? { playerName: players[flip7WinnerIdx]?.name } : null,
      log: showFlip7 ? `🌟 ${players[flip7WinnerIdx]?.name} ŞANS YEDİ! Tur bitti.` : 'Tur bitti!',
    })
  },

  nextRound() {
    const { players, targetScore, deck, usedCardsPile, round, dealerIndex } = get()

    // Check game over
    const maxScore = Math.max(...players.map(p => p.totalScore))
    if (maxScore >= targetScore) {
      set({ phase: 'gameEnd', showOverlay: null })
      return
    }

    const newDealerIdx = (dealerIndex + 1) % players.length
    const resetPlayers = resetPlayersForRound(players)

    // Refill deck if needed
    let newDeck = deck
    let newUsed = usedCardsPile
    if (newDeck.length === 0) {
      newDeck = shuffleDeck(usedCardsPile)
      newUsed = []
    }

    set({
      players: resetPlayers,
      deck: newDeck,
      usedCardsPile: newUsed,
      discardPile: [],
      round: round + 1,
      dealerIndex: newDealerIdx,
      currentPlayerIndex: newDealerIdx,
      phase: 'dealing',
      showOverlay: null,
      pendingAction: null,
      flip7WinnerIdx: -1,
      flipThreeState: null,
      log: 'Kartlar dağıtılıyor...',
    })
    get().dealNextCard(0)
  },

  restartGame() {
    set({ ...INITIAL_STATE })
  },
}))
