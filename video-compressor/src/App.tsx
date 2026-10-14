import { useState } from 'react'
import Navbar from './components/Navbar'
import Compressor from './components/Compressor'
import Home from './pages/Home'
import { isTauri } from './lib/env'

type Page = 'home' | 'compress'

function App() {
  const [page, setPage] = useState<Page>('home')

  // Desktop app: always show the compressor.
  if (isTauri()) {
    return <Compressor />
  }

  // Web: show navbar + page router.
  return (
    <div className="min-h-screen">
      <Navbar page={page} onNavigate={setPage} />
      {page === 'home' ? (
        <Home onNavigate={setPage} />
      ) : (
        <Compressor />
      )}
    </div>
  )
}

export default App
