import { useState } from 'react'
import Navbar from './components/Navbar'
import Compressor from './components/Compressor'
import Home from './pages/Home'
import Downloader from './pages/Download'
import type { Page } from './types'
import { isTauri } from './lib/env'

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
      {page === 'home' && <Home onNavigate={setPage} />}
      {page === 'compress' && <Compressor />}
      {page === 'download' && <Downloader />}
    </div>
  )
}

export default App
