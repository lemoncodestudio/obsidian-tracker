import { Sidebar } from './components/Sidebar'
import { TicketList } from './components/TicketList'
import { TicketDetail } from './components/TicketDetail'
import { useTickets } from './hooks/useTickets'
import { useKeyboard } from './hooks/useKeyboard'

function App() {
  useTickets()
  useKeyboard()

  return (
    <div className="flex h-screen bg-white">
      <Sidebar />
      <TicketList />
      <TicketDetail />
    </div>
  )
}

export default App
