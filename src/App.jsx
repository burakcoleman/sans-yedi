import { useSocketStore } from './store/socketStore.js'
import { HomeScreen } from './components/screens/HomeScreen.jsx'
import { LobbyScreen } from './components/screens/LobbyScreen.jsx'
import { GameScreen } from './components/screens/GameScreen.jsx'
import { WinScreen } from './components/screens/WinScreen.jsx'

function App() {
  const phase = useSocketStore(s => s.phase)

  if (phase === 'home') return <HomeScreen />
  if (phase === 'lobby') return <LobbyScreen />
  if (phase === 'gameEnd') return <WinScreen />
  return <GameScreen />
}

export default App
