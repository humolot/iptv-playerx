import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  PictureInPicture2, ArrowLeft, Heart, Cast, Cpu, RefreshCw
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Channel } from '../../types'
import { ChannelLogo } from '../common/ChannelLogo'
import { useStore } from '../../store'
import { CastModal } from './CastModal'

interface Props {
  channel: Channel
  isPlaying: boolean
  isLoading: boolean
  isMuted: boolean
  volume: number
  isFullscreen: boolean
  playerTypeLabel: string
  onTogglePlay: () => void
  onVolumeChange: (v: number) => void
  onToggleMute: () => void
  onToggleFullscreen: () => void
  onTogglePiP: () => void
  onBack: () => void
  onRetry: () => void
}

export function PlayerControls({
  channel, isPlaying, isLoading, isMuted, volume, isFullscreen,
  playerTypeLabel, onTogglePlay, onVolumeChange, onToggleMute,
  onToggleFullscreen, onTogglePiP, onBack, onRetry
}: Props) {
  const { t } = useTranslation()
  const { favorites, toggleFavorite } = useStore()
  const isFav = favorites.has(channel.id)
  const [controlsVisible, setControlsVisible] = useState(true)
  const [showCast, setShowCast] = useState(false)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>()

  // Always show controls when loading
  const shouldShowControls = controlsVisible || isLoading

  const showControls = useCallback(() => {
    setControlsVisible(true)
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    // Don't auto-hide when loading
    if (!isLoading) {
      hideTimerRef.current = setTimeout(() => setControlsVisible(false), 4000)
    }
  }, [isLoading])

  // Keep visible while loading
  useEffect(() => {
    if (isLoading) {
      setControlsVisible(true)
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    } else {
      // Start hide timer after loading finishes
      hideTimerRef.current = setTimeout(() => setControlsVisible(false), 4000)
    }
    return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current) }
  }, [isLoading])

  useEffect(() => {
    showControls()
    return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current) }
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      showControls()
      switch (e.code) {
        case 'Space': e.preventDefault(); if (!isLoading) onTogglePlay(); break
        case 'KeyF': onToggleFullscreen(); break
        case 'KeyM': onToggleMute(); break
        case 'Escape': if (isFullscreen) onToggleFullscreen(); else onBack(); break
        case 'ArrowLeft': e.preventDefault(); onBack(); break
        case 'KeyP': onTogglePiP(); break
        case 'KeyR': onRetry(); break
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isLoading, isFullscreen, showControls, onTogglePlay, onToggleFullscreen, onToggleMute, onBack, onTogglePiP, onRetry])

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      onMouseMove={showControls}
      onMouseEnter={showControls}
      onClick={showControls}
    >
      {/* ── ALWAYS VISIBLE: Back button (top-left, never hides) ── */}
      <div className="absolute top-3 left-3 z-30 pointer-events-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-2 bg-black/70 backdrop-blur-sm hover:bg-black/90 text-white rounded-xl transition-all border border-white/10 hover:border-white/30 active:scale-95"
        >
          <ArrowLeft size={16} />
          <span className="text-sm font-medium">{t('player.back')}</span>
        </button>
      </div>

      <AnimatePresence>
        {shouldShowControls && (
          <>
            {/* Top info bar */}
            <motion.div
              className="absolute top-0 left-0 right-0 pointer-events-auto"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center gap-3 pl-28 pr-4 pt-3 pb-6 bg-gradient-to-b from-black/80 to-transparent">
                <ChannelLogo channel={channel} size="sm" />
                <div className="min-w-0">
                  <p className="text-white font-semibold text-sm leading-tight truncate">{channel.name}</p>
                  <p className="text-slate-400 text-xs truncate">{channel.group}</p>
                </div>

                <span className="ml-1 px-2 py-0.5 bg-accent-700/40 border border-accent-600/30 text-accent-300 text-xs rounded-full flex-shrink-0">
                  <Cpu size={9} className="inline mr-1" />
                  {playerTypeLabel}
                </span>

                {/* Live badge */}
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/20 border border-red-500/30 rounded-full flex-shrink-0">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-red-400 text-xs font-semibold">LIVE</span>
                </div>

                {isLoading && (
                  <span className="text-amber-400 text-xs flex items-center gap-1 flex-shrink-0">
                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse inline-block" />
                    Connecting...
                  </span>
                )}

                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={() => toggleFavorite(channel)}
                    className={`p-2 rounded-xl transition-colors ${isFav ? 'text-red-400 bg-red-500/20' : 'text-white/70 bg-black/40 hover:bg-black/70 hover:text-red-300'}`}
                  >
                    <Heart size={16} fill={isFav ? 'currentColor' : 'none'} />
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Bottom controls */}
            <motion.div
              className="absolute bottom-0 left-0 right-0 pointer-events-auto"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="px-4 pt-6 pb-4 bg-gradient-to-t from-black/90 to-transparent">
                {/* Volume */}
                <div className="flex items-center gap-3 mb-4">
                  <button
                    onClick={onToggleMute}
                    className="text-white/80 hover:text-white transition-colors"
                  >
                    {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                  </button>
                  <input
                    type="range" min={0} max={100} value={isMuted ? 0 : volume}
                    onChange={e => onVolumeChange(Number(e.target.value))}
                    className="w-28 cursor-pointer"
                    style={{ accentColor: '#7c3aed' }}
                  />
                  <span className="text-slate-400 text-xs w-8 select-none">{isMuted ? 0 : volume}%</span>
                </div>

                {/* Main row */}
                <div className="flex items-center justify-between">
                  {/* Left: Play + Retry */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={isLoading ? onRetry : onTogglePlay}
                      disabled={false}
                      className="w-11 h-11 bg-accent-600 hover:bg-accent-500 active:bg-accent-700 rounded-full flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 shadow-glow"
                    >
                      {isLoading
                        ? <RefreshCw size={18} className="animate-spin" />
                        : isPlaying
                          ? <Pause size={20} fill="white" />
                          : <Play size={20} fill="white" className="ml-0.5" />
                      }
                    </button>

                    {isLoading && (
                      <button
                        onClick={onRetry}
                        className="px-3 py-1.5 text-xs text-amber-300 hover:text-white bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-lg transition-colors"
                      >
                        Retry
                      </button>
                    )}
                  </div>

                  {/* Right: Extra controls */}
                  <div className="flex items-center gap-1.5">
                    <CtrlBtn onClick={() => setShowCast(true)} title={t('player.cast')}>
                      <Cast size={16} />
                    </CtrlBtn>
                    <CtrlBtn onClick={onTogglePiP} title={t('player.pip')}>
                      <PictureInPicture2 size={16} />
                    </CtrlBtn>
                    <CtrlBtn onClick={onToggleFullscreen} title={isFullscreen ? t('player.exitFullscreen') : t('player.fullscreen')}>
                      {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                    </CtrlBtn>
                  </div>
                </div>

                {/* Keyboard hints */}
                <div className="flex gap-4 mt-3 text-slate-600 text-xs select-none">
                  <span>Space = play/pause</span>
                  <span>F = fullscreen</span>
                  <span>M = mute</span>
                  <span>← = back</span>
                  <span>R = retry</span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Cast modal */}
      <div className="pointer-events-auto">
        <CastModal isOpen={showCast} onClose={() => setShowCast(false)} channel={channel} />
      </div>
    </div>
  )
}

function CtrlBtn({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-2 rounded-lg bg-black/50 hover:bg-white/10 active:bg-white/20 text-white/80 hover:text-white transition-colors border border-white/5 hover:border-white/20 active:scale-95"
    >
      {children}
    </button>
  )
}
