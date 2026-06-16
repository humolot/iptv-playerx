import { useState } from 'react'
import { motion } from 'framer-motion'
import { Play, Heart, Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Channel } from '../../types'
import { ChannelLogo } from '../common/ChannelLogo'
import { useStore } from '../../store'

interface Props {
  channel: Channel
  onClick: (channel: Channel) => void
  isBlocked?: boolean
}

export function ChannelCard({ channel, onClick, isBlocked }: Props) {
  const { t } = useTranslation()
  // Selector-based subscription: only re-renders when THIS channel's fav status changes
  const isFav = useStore(state => state.favorites.has(channel.id))
  const toggleFavorite = useStore(state => state.toggleFavorite)
  const [hovered, setHovered] = useState(false)

  const handleFavClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    toggleFavorite(channel)
  }

  return (
    <motion.div
      className="relative group cursor-pointer rounded-xl overflow-hidden bg-bg-card border border-white/5"
      whileHover={{ scale: 1.04, y: -4 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={() => onClick(channel)}
      style={{
        boxShadow: hovered ? '0 8px 32px rgba(124,58,237,0.25)' : '0 2px 8px rgba(0,0,0,0.3)'
      }}
    >
      {/* Logo area */}
      <div className="relative aspect-video bg-bg-secondary overflow-hidden flex items-center justify-center">
        <ChannelLogo channel={channel} size="lg" className="m-auto" />

        {/* Hover overlay */}
        <motion.div
          className="absolute inset-0 bg-black/60 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: hovered ? 1 : 0 }}
          transition={{ duration: 0.2 }}
        >
          {isBlocked ? (
            <div className="flex flex-col items-center gap-1">
              <Lock className="text-white" size={28} />
              <span className="text-white text-xs">{t('parental.locked')}</span>
            </div>
          ) : (
            <motion.div
              className="w-12 h-12 bg-accent-600 rounded-full flex items-center justify-center shadow-glow"
              initial={{ scale: 0.7 }}
              animate={{ scale: hovered ? 1 : 0.7 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              <Play className="text-white ml-1" size={20} fill="white" />
            </motion.div>
          )}
        </motion.div>

        {/* Category badge */}
        {channel.group && (
          <div className="absolute top-2 left-2">
            <span className="px-2 py-0.5 bg-black/60 backdrop-blur-sm text-slate-300 text-xs rounded-full">
              {channel.group}
            </span>
          </div>
        )}

        {/* Country flag */}
        {channel.country && (
          <div className="absolute top-2 right-2 text-lg leading-none">
            {countryToFlag(channel.country)}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">{channel.name}</p>
          {channel.group && (
            <p className="text-slate-400 text-xs truncate mt-0.5">{channel.group}</p>
          )}
        </div>

        {/* Favorite button */}
        <motion.button
          onClick={handleFavClick}
          className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
            isFav ? 'text-red-400' : 'text-slate-500 hover:text-red-400'
          }`}
          whileTap={{ scale: 0.8 }}
        >
          <Heart size={14} fill={isFav ? 'currentColor' : 'none'} />
        </motion.button>
      </div>

      {/* Accent border on hover */}
      <motion.div
        className="absolute inset-0 rounded-xl border border-accent-600 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.2 }}
      />
    </motion.div>
  )
}

function countryToFlag(code: string): string {
  const upper = code.toUpperCase()
  if (upper.length !== 2) return ''
  return String.fromCodePoint(...upper.split('').map(c => 0x1F1E6 + c.charCodeAt(0) - 65))
}
