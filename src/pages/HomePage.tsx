import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { RefreshCw, AlertTriangle, Database, Wifi } from 'lucide-react'
import { motion } from 'framer-motion'
import { useChannels, useChannelsByCategory } from '../hooks/useChannels'
import { useParentalControl } from '../hooks/useParentalControl'
import { HeroSection } from '../components/Home/HeroSection'
import { ChannelRow } from '../components/Home/ChannelRow'
import { LoadingSpinner, SkeletonCard } from '../components/common/LoadingSpinner'
import { Modal } from '../components/common/Modal'
import { PINPad } from '../components/common/PINPad'
import { useStore } from '../store'
import { Channel } from '../types'

export function HomePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { channels, filteredChannels, isLoadingChannels, loadingSource, fetchProgress, channelError, reload } = useChannels()
  const { history } = useStore()
  const channelsByCategory = useChannelsByCategory()
  const {
    pendingChannel, showPINModal, pinError, tryWatchChannel, submitPIN, closePINModal, emergencyReset
  } = useParentalControl()

  const handleChannelClick = (channel: Channel) => {
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

  if (isLoadingChannels && !channels.length) {
    return (
      <div className="h-full flex flex-col">
        {/* Hero skeleton */}
        <div className="h-72 bg-bg-secondary animate-pulse relative overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              {loadingSource === 'cache' ? (
                <>
                  <div className="flex items-center gap-2 px-4 py-2 bg-black/40 backdrop-blur-sm rounded-xl border border-teal-500/30">
                    <Database size={16} className="text-teal-400 animate-pulse" />
                    <span className="text-white text-sm">Loading from local database…</span>
                  </div>
                  <p className="text-slate-500 text-xs">Almost instant — loading from SQLite cache</p>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 px-4 py-2 bg-black/40 backdrop-blur-sm rounded-xl border border-white/10">
                    <Wifi size={16} className="text-accent-400 animate-pulse" />
                    <span className="text-white text-sm">
                      {fetchProgress
                        ? `${fetchProgress.category} (${fetchProgress.loaded}/${fetchProgress.total})`
                        : 'Connecting to IPTV-org playlists…'}
                    </span>
                  </div>
                  {fetchProgress ? (
                    <div className="w-48 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent-500 rounded-full transition-all duration-300"
                        style={{ width: `${(fetchProgress.loaded / fetchProgress.total) * 100}%` }}
                      />
                    </div>
                  ) : (
                    <p className="text-slate-500 text-xs">First launch — saved locally after this, next time is instant</p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
        <div className="p-8 space-y-8">
          {[1, 2, 3].map(i => (
            <div key={i}>
              <div className="h-6 w-48 bg-bg-card rounded animate-pulse mb-4" />
              <div className="flex gap-4">
                {[1,2,3,4,5,6].map(j => <SkeletonCard key={j} className="w-48 flex-shrink-0" />)}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (channelError) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto text-red-400 mb-4" size={48} />
          <h2 className="text-white text-xl font-semibold mb-2">{t('common.error')}</h2>
          <p className="text-slate-400 mb-6 max-w-sm">{t('home.errorLoading')}</p>
          <button
            onClick={reload}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent-600 hover:bg-accent-500 text-white rounded-xl transition-colors mx-auto"
          >
            <RefreshCw size={16} />
            {t('home.retry')}
          </button>
        </div>
      </div>
    )
  }

  const featured = filteredChannels.slice(0, 8)
  const categories = Object.entries(channelsByCategory)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 10)

  return (
    <div className="min-h-full pb-8">
      {/* Hero */}
      {featured.length > 0 && (
        <HeroSection channels={featured} onPlay={handleChannelClick} />
      )}

      {/* Recently watched */}
      {history.length > 0 && (
        <div className="mt-8">
          <ChannelRow
            title={t('home.recentlyWatched')}
            channels={history.slice(0, 20)}
            onChannelClick={handleChannelClick}
          />
        </div>
      )}

      {/* Category rows */}
      <div className="mt-8 space-y-8">
        {categories.map(([category, chs]) => (
          <ChannelRow
            key={category}
            title={category}
            channels={chs.slice(0, 20)}
            onChannelClick={handleChannelClick}
            showAll={() => {
              useStore.getState().setSelectedCategory(category)
              navigate('/browse')
            }}
          />
        ))}
      </div>

      {/* Empty state */}
      {!isLoadingChannels && filteredChannels.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24">
          <p className="text-slate-400 text-lg">{t('home.noChannels')}</p>
          <button
            onClick={reload}
            className="mt-4 flex items-center gap-2 px-4 py-2 bg-accent-700 hover:bg-accent-600 text-white rounded-xl text-sm transition-colors"
          >
            <RefreshCw size={14} />
            {t('home.retry')}
          </button>
        </div>
      )}

      {/* PIN Modal */}
      <Modal isOpen={showPINModal} onClose={closePINModal} hideClose title="">
        <div className="py-4">
          <h3 className="text-white text-lg font-semibold text-center mb-1">{t('parental.locked')}</h3>
          {pendingChannel && (
            <p className="text-slate-400 text-sm text-center mb-6">{pendingChannel.name}</p>
          )}
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
