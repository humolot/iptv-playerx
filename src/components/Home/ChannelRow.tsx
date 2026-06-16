import { useRef } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Channel } from '../../types'
import { ChannelCard } from './ChannelCard'
import { useStore } from '../../store'

interface Props {
  title: string
  channels: Channel[]
  onChannelClick: (channel: Channel) => void
  showAll?: () => void
}

export function ChannelRow({ title, channels, onChannelClick, showAll }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const { isChannelBlocked } = useStore()

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return
    const amount = scrollRef.current.clientWidth * 0.75
    scrollRef.current.scrollBy({ left: dir === 'right' ? amount : -amount, behavior: 'smooth' })
  }

  if (!channels.length) return null

  return (
    <motion.section
      className="relative group/row"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-8">
        <h2 className="text-white text-xl font-semibold tracking-tight">{title}</h2>
        {showAll && (
          <button
            onClick={showAll}
            className="text-accent-400 text-sm hover:text-accent-300 transition-colors"
          >
            View all →
          </button>
        )}
      </div>

      {/* Scroll container */}
      <div className="relative">
        {/* Left fade + button */}
        <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-bg-primary to-transparent z-10 pointer-events-none" />
        <button
          onClick={() => scroll('left')}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/70 backdrop-blur-sm border border-white/10 rounded-full text-white opacity-0 group-hover/row:opacity-100 transition-all hover:bg-accent-700 hover:border-accent-500"
        >
          <ChevronLeft size={18} />
        </button>

        {/* Scrollable row */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide px-8 pb-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {channels.map((channel, i) => (
            <motion.div
              key={channel.id}
              className="flex-shrink-0 w-48"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03, duration: 0.3 }}
            >
              <ChannelCard
                channel={channel}
                onClick={onChannelClick}
                isBlocked={isChannelBlocked(channel)}
              />
            </motion.div>
          ))}
        </div>

        {/* Right fade + button */}
        <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-bg-primary to-transparent z-10 pointer-events-none" />
        <button
          onClick={() => scroll('right')}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-2 bg-black/70 backdrop-blur-sm border border-white/10 rounded-full text-white opacity-0 group-hover/row:opacity-100 transition-all hover:bg-accent-700 hover:border-accent-500"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </motion.section>
  )
}
