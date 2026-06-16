import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Grid, List } from 'lucide-react'
import { useStore } from '../store'
import { useParentalControl } from '../hooks/useParentalControl'
import { ChannelCard } from '../components/Home/ChannelCard'
import { Modal } from '../components/common/Modal'
import { PINPad } from '../components/common/PINPad'
import { SkeletonCard } from '../components/common/LoadingSpinner'
import { ChannelLogo } from '../components/common/ChannelLogo'
import { Channel } from '../types'

type ViewMode = 'grid' | 'list'
const PAGE_SIZE = 60

export function BrowsePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  // Selector subscriptions — only re-render when these specific values change
  const filteredChannels = useStore(state => state.filteredChannels)
  const categories = useStore(state => state.categories)
  const countries = useStore(state => state.countries)
  const isLoadingChannels = useStore(state => state.isLoadingChannels)
  const selectedCategory = useStore(state => state.selectedCategory)
  const selectedCountry = useStore(state => state.selectedCountry)
  const setSelectedCategory = useStore(state => state.setSelectedCategory)
  const setSelectedCountry = useStore(state => state.setSelectedCountry)

  const { isChannelBlocked, pendingChannel, showPINModal, pinError, tryWatchChannel, submitPIN, closePINModal, emergencyReset } = useParentalControl()
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [displayLimit, setDisplayLimit] = useState(PAGE_SIZE)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Reset display limit when filters change
  useEffect(() => {
    setDisplayLimit(PAGE_SIZE)
  }, [filteredChannels])

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    if (!sentinelRef.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && displayLimit < filteredChannels.length) {
          setDisplayLimit(prev => Math.min(prev + PAGE_SIZE, filteredChannels.length))
        }
      },
      { rootMargin: '200px' }
    )
    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [displayLimit, filteredChannels.length])

  const handlePlay = (channel: Channel) => {
    tryWatchChannel(channel, (ch) => {
      navigate(`/player/${encodeURIComponent(ch.id)}`, { state: { channel: ch } })
    })
  }

  const handlePINSubmit = (pin: string) => {
    submitPIN(pin, () => {
      if (pendingChannel) {
        navigate(`/player/${encodeURIComponent(pendingChannel.id)}`, { state: { channel: pendingChannel } })
      }
    })
  }

  const visibleChannels = filteredChannels.slice(0, displayLimit)

  return (
    <div className="flex h-full">
      {/* Filter sidebar */}
      <aside className="w-56 flex-shrink-0 border-r border-white/5 overflow-y-auto py-4 px-3">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 mb-3">
          {t('browse.allCategories')}
        </h3>
        <div className="space-y-0.5">
          <CategoryBtn
            label={t('common.all')}
            active={!selectedCategory}
            onClick={() => setSelectedCategory(null)}
          />
          {categories.map(cat => (
            <CategoryBtn
              key={cat}
              label={cat}
              active={selectedCategory === cat}
              onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
            />
          ))}
        </div>

        {countries.length > 0 && (
          <>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 mb-3 mt-6">
              {t('browse.allCountries')}
            </h3>
            <div className="space-y-0.5">
              <CategoryBtn
                label={t('common.all')}
                active={!selectedCountry}
                onClick={() => setSelectedCountry(null)}
              />
              {countries.slice(0, 30).map(country => (
                <CategoryBtn
                  key={country.code}
                  label={`${country.flag || ''} ${country.name}`}
                  active={selectedCountry === country.code}
                  onClick={() => setSelectedCountry(country.code === selectedCountry ? null : country.code)}
                />
              ))}
            </div>
          </>
        )}
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div>
            <h1 className="text-white text-xl font-bold">
              {selectedCategory || t('browse.title')}
            </h1>
            <p className="text-slate-400 text-sm mt-0.5">
              {displayLimit < filteredChannels.length
                ? `${t('browse.channelCount', { count: filteredChannels.length })} — showing ${displayLimit}`
                : t('browse.channelCount', { count: filteredChannels.length })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-accent-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-accent-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
              <List size={16} />
            </button>
          </div>
        </div>

        {/* Channel grid/list */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoadingChannels && filteredChannels.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {Array.from({ length: 18 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filteredChannels.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-slate-400">{t('browse.noResults')}</p>
            </div>
          ) : viewMode === 'grid' ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {visibleChannels.map((channel) => (
                  <ChannelCard
                    key={channel.id}
                    channel={channel}
                    onClick={handlePlay}
                    isBlocked={isChannelBlocked(channel)}
                  />
                ))}
              </div>
              {/* Infinite scroll sentinel */}
              <div ref={sentinelRef} className="h-8 mt-4 flex items-center justify-center">
                {displayLimit < filteredChannels.length && (
                  <p className="text-slate-500 text-sm">Loading more…</p>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                {visibleChannels.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => handlePlay(channel)}
                    className="w-full flex items-center gap-4 p-3 rounded-xl bg-bg-card hover:bg-bg-hover border border-white/5 hover:border-accent-600/30 transition-all text-left"
                  >
                    <ChannelLogo channel={channel} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{channel.name}</p>
                      <p className="text-slate-400 text-xs truncate">{channel.group}</p>
                    </div>
                    {channel.country && (
                      <span className="text-lg flex-shrink-0">{countryToFlag(channel.country)}</span>
                    )}
                  </button>
                ))}
              </div>
              {/* Infinite scroll sentinel */}
              <div ref={sentinelRef} className="h-8 mt-4 flex items-center justify-center">
                {displayLimit < filteredChannels.length && (
                  <p className="text-slate-500 text-sm">Loading more…</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* PIN Modal */}
      <Modal isOpen={showPINModal} onClose={closePINModal} hideClose>
        <div className="py-4">
          <h3 className="text-white text-lg font-semibold text-center mb-6">{t('parental.locked')}</h3>
          <PINPad onSubmit={handlePINSubmit} error={pinError} />
          <button
            onClick={emergencyReset}
            className="w-full mt-4 text-center text-slate-600 hover:text-red-400 text-xs transition-colors"
          >
            Forgot PIN? Reset parental controls
          </button>
        </div>
      </Modal>
    </div>
  )
}

function CategoryBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
        active
          ? 'bg-accent-600/20 text-accent-400 font-medium'
          : 'text-slate-400 hover:text-white hover:bg-white/5'
      }`}
    >
      {label}
    </button>
  )
}

function countryToFlag(code: string): string {
  const upper = code.toUpperCase()
  if (upper.length !== 2) return ''
  return String.fromCodePoint(...upper.split('').map(c => 0x1F1E6 + c.charCodeAt(0) - 65))
}
