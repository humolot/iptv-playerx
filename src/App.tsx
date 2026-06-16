import { Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { AppLayout } from './components/Layout/AppLayout'
import { HomePage } from './pages/HomePage'
import { BrowsePage } from './pages/BrowsePage'
import { FavoritesPage } from './pages/FavoritesPage'
import { HistoryPage } from './pages/HistoryPage'
import { SourcesPage } from './pages/SourcesPage'
import { SettingsPage } from './pages/SettingsPage'
import { PlayerPage } from './pages/PlayerPage'
import { useStore } from './store'
import i18n from './i18n'

export function App() {
  const { setSettings, setParentalControl, setFavorites, setHistory } = useStore()

  useEffect(() => {
    async function init() {
      if (!window.electronAPI) return

      // Load all settings
      const settings = await window.electronAPI.getAllSettings()
      if (Object.keys(settings).length > 0) {
        setSettings(settings as any)
        if (settings.language) i18n.changeLanguage(settings.language)
      }

      // Load parental control
      const pc = await window.electronAPI.getParentalControl()
      if (pc) {
        setParentalControl({
          enabled: !!pc.enabled,
          pin_hash: pc.pin_hash,
          block_adult: !!pc.block_adult,
          blocked_categories: JSON.parse(pc.blocked_categories || '[]'),
          blocked_channels: JSON.parse(pc.blocked_channels || '[]')
        })
      }

      // Load favorites IDs
      const favs = await window.electronAPI.getFavorites()
      setFavorites(favs.map((f: any) => f.channel_id))

      // Load history
      const hist = await window.electronAPI.getHistory(50)
      setHistory(hist.map((h: any) => ({
        id: h.channel_id,
        name: h.channel_name,
        url: h.channel_url,
        logo: h.logo_url,
        group: h.group_title
      })))
    }

    init()
  }, [])

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/browse" element={<BrowsePage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/sources" element={<SourcesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/player/:id" element={<PlayerPage />} />
      </Route>
    </Routes>
  )
}
