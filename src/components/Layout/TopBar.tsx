import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Globe, Minus, Square, XCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../../store'

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' }
]

export function TopBar() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { searchQuery, setSearchQuery, setSettings } = useStore()
  const [showSearch, setShowSearch] = useState(false)
  const [showLang, setShowLang] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  const isPlayer = location.pathname.startsWith('/player')

  useEffect(() => {
    if (showSearch) searchRef.current?.focus()
  }, [showSearch])

  const handleSearch = (q: string) => {
    setSearchQuery(q)
    if (q && location.pathname !== '/browse') {
      navigate('/browse')
    }
  }

  const changeLang = (code: string) => {
    i18n.changeLanguage(code)
    setSettings({ language: code })
    window.electronAPI?.setSetting('language', code)
    setShowLang(false)
  }

  const currentLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0]

  if (isPlayer) return null

  return (
    <header className="h-12 flex items-center justify-between px-4 border-b border-white/5 bg-bg-secondary/50 backdrop-blur-sm flex-shrink-0" style={{ WebkitAppRegion: 'drag' } as any}>
      {/* Drag region left spacer */}
      <div className="w-4" />

      {/* Search */}
      <div className="flex-1 flex justify-center max-w-md" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <AnimatePresence mode="wait">
          {showSearch ? (
            <motion.div
              key="search"
              className="flex items-center gap-2 w-full bg-bg-card border border-white/10 rounded-xl px-3 py-1.5"
              initial={{ width: '40px', opacity: 0 }}
              animate={{ width: '100%', opacity: 1 }}
              exit={{ width: '40px', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            >
              <Search size={14} className="text-slate-400 flex-shrink-0" />
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                placeholder={t('browse.searchPlaceholder')}
                className="flex-1 bg-transparent text-white text-sm outline-none placeholder-slate-500"
                onKeyDown={e => e.key === 'Escape' && setShowSearch(false)}
              />
              {searchQuery && (
                <button onClick={() => { handleSearch(''); setShowSearch(false) }}>
                  <X size={14} className="text-slate-400 hover:text-white" />
                </button>
              )}
            </motion.div>
          ) : (
            <motion.button
              key="searchBtn"
              onClick={() => setShowSearch(true)}
              className="flex items-center gap-2 px-4 py-1.5 bg-bg-card border border-white/5 rounded-xl text-slate-400 hover:text-white hover:border-white/20 transition-colors text-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            >
              <Search size={14} />
              <span>{t('common.search')}</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as any}>
        {/* Language selector */}
        <div className="relative">
          <button
            onClick={() => setShowLang(v => !v)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-xs"
          >
            <span>{currentLang.flag}</span>
            <span>{currentLang.code.toUpperCase()}</span>
          </button>
          <AnimatePresence>
            {showLang && (
              <motion.div
                className="absolute right-0 top-full mt-1 bg-bg-card border border-white/10 rounded-xl shadow-card overflow-hidden z-50 w-36"
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
              >
                {LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => changeLang(lang.code)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                      lang.code === i18n.language
                        ? 'text-accent-400 bg-accent-600/10'
                        : 'text-slate-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.name}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Window controls */}
        <div className="flex items-center gap-1 ml-2 pl-2 border-l border-white/10">
          <WinBtn onClick={() => window.electronAPI?.minimize()} title="Minimize" color="yellow">
            <Minus size={10} />
          </WinBtn>
          <WinBtn onClick={() => window.electronAPI?.maximize()} title="Maximize" color="green">
            <Square size={9} />
          </WinBtn>
          <WinBtn onClick={() => window.electronAPI?.close()} title="Close" color="red">
            <X size={10} />
          </WinBtn>
        </div>
      </div>
    </header>
  )
}

function WinBtn({ onClick, title, color, children }: {
  onClick: () => void; title: string; color: 'red' | 'yellow' | 'green'; children: React.ReactNode
}) {
  const colors = {
    red: 'hover:bg-red-500',
    yellow: 'hover:bg-yellow-500',
    green: 'hover:bg-green-500'
  }
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-white ${colors[color]} transition-all`}
    >
      {children}
    </button>
  )
}
