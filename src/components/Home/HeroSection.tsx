import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Heart, Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Channel } from '../../types'
import { useStore } from '../../store'
import { ChannelLogo } from '../common/ChannelLogo'

interface Props {
  channels: Channel[]
  onPlay: (channel: Channel) => void
}

export function HeroSection({ channels, onPlay }: Props) {
  const { t } = useTranslation()
  const { favorites, toggleFavorite } = useStore()
  const [current, setCurrent] = useState(0)

  const featured = channels.slice(0, 8)
  const channel = featured[current]

  useEffect(() => {
    if (featured.length <= 1) return
    const interval = setInterval(() => {
      setCurrent(c => (c + 1) % featured.length)
    }, 8000)
    return () => clearInterval(interval)
  }, [featured.length])

  if (!channel) return null

  const isFav = favorites.has(channel.id)

  return (
    <div className="relative h-72 md:h-96 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7 }}
        >
          {/* Background with logo */}
          <div className="absolute inset-0 bg-bg-secondary">
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: channel.logo ? `url(${channel.logo})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'blur(40px) saturate(150%)'
              }}
            />
          </div>

          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-r from-bg-primary via-bg-primary/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-transparent to-transparent" />

          {/* Content */}
          <div className="absolute inset-0 flex items-center px-8 md:px-16">
            <div className="flex items-center gap-8 max-w-2xl">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <ChannelLogo channel={channel} size="xl" />
              </motion.div>

              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex-1"
              >
                {channel.group && (
                  <span className="px-3 py-1 bg-accent-600/30 border border-accent-600/40 text-accent-300 text-xs rounded-full font-medium">
                    {channel.group}
                  </span>
                )}
                <h1 className="text-white text-3xl md:text-4xl font-bold mt-2 mb-1 leading-tight">
                  {channel.name}
                </h1>
                <p className="text-slate-400 text-sm mb-4">
                  {channel.country && `${countryToFlag(channel.country)} `}
                  {channel.languages?.join(', ')}
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => onPlay(channel)}
                    className="flex items-center gap-2 px-6 py-2.5 bg-accent-600 hover:bg-accent-500 text-white font-semibold rounded-xl transition-all hover:shadow-glow active:scale-95"
                  >
                    <Play size={18} fill="white" />
                    Watch Now
                  </button>
                  <button
                    onClick={() => toggleFavorite(channel)}
                    className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl font-medium transition-all active:scale-95 ${
                      isFav
                        ? 'bg-red-500/20 border-red-500/40 text-red-400'
                        : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                    }`}
                  >
                    <Heart size={16} fill={isFav ? 'currentColor' : 'none'} />
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Dots indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
        {featured.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`transition-all rounded-full ${
              i === current ? 'w-6 h-1.5 bg-accent-400' : 'w-1.5 h-1.5 bg-white/30 hover:bg-white/60'
            }`}
          />
        ))}
      </div>
    </div>
  )
}

function countryToFlag(code: string): string {
  const upper = code.toUpperCase()
  if (upper.length !== 2) return ''
  return String.fromCodePoint(...upper.split('').map(c => 0x1F1E6 + c.charCodeAt(0) - 65))
}
