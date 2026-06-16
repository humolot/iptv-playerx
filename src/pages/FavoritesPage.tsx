import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Heart } from 'lucide-react'
import { useStore } from '../store'
import { useParentalControl } from '../hooks/useParentalControl'
import { ChannelCard } from '../components/Home/ChannelCard'
import { Modal } from '../components/common/Modal'
import { PINPad } from '../components/common/PINPad'
import { Channel } from '../types'

export function FavoritesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { favorites, setFavorites } = useStore()
  const { pendingChannel, showPINModal, pinError, tryWatchChannel, submitPIN, closePINModal } = useParentalControl()
  const [favChannels, setFavChannels] = useState<Channel[]>([])

  useEffect(() => {
    window.electronAPI?.getFavorites().then(rows => {
      const ids = rows.map((r: any) => r.channel_id)
      setFavorites(ids)
      setFavChannels(rows.map((r: any) => ({
        id: r.channel_id,
        name: r.channel_name,
        url: r.channel_url,
        logo: r.logo_url || undefined,
        group: r.group_title || undefined,
        country: r.country || undefined
      })))
    })
  }, [])

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

  if (favChannels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 bg-bg-card rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Heart className="text-slate-500" size={36} />
          </div>
          <h2 className="text-white text-xl font-semibold">{t('favorites.empty')}</h2>
          <p className="text-slate-400 text-sm mt-2">{t('favorites.emptyDesc')}</p>
          <button
            onClick={() => navigate('/browse')}
            className="mt-6 px-6 py-2.5 bg-accent-600 hover:bg-accent-500 text-white rounded-xl transition-colors"
          >
            {t('nav.browse')}
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-white text-2xl font-bold mb-6">{t('favorites.title')}</h1>
      <motion.div
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      >
        {favChannels.map((channel, i) => (
          <motion.div
            key={channel.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <ChannelCard channel={channel} onClick={handlePlay} />
          </motion.div>
        ))}
      </motion.div>

      <Modal isOpen={showPINModal} onClose={closePINModal} hideClose>
        <div className="py-4">
          <h3 className="text-white text-lg font-semibold text-center mb-6">{t('parental.locked')}</h3>
          <PINPad onSubmit={handlePINSubmit} error={pinError} />
        </div>
      </Modal>
    </div>
  )
}
