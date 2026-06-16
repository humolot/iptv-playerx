import { useEffect, useRef, useState, useCallback } from 'react'
import Hls from 'hls.js'
import mpegts from 'mpegts.js'
import { Channel, PlayerType } from '../../types'
import { detectStreamType } from '../../utils/m3u'
import { PlayerControls } from './PlayerControls'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  channel: Channel
  playerType: PlayerType
  onBack: () => void
  autoPlay?: boolean
}

const LOADING_TIMEOUT_MS = 20000

export function VideoPlayer({ channel, playerType, onBack, autoPlay = true }: Props) {
  const { t } = useTranslation()
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const mpegtsRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const retryRef = useRef(0)
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const notifiedRef = useRef(false)

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [volume, setVolume] = useState(100)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playerTypeLabel, setPlayerTypeLabel] = useState('Auto')

  const clearLoadTimeout = () => {
    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current)
  }

  const startLoadTimeout = useCallback(() => {
    clearLoadTimeout()
    loadTimeoutRef.current = setTimeout(() => {
      // If still loading after timeout, try next player or show error
      if (retryRef.current < 2) {
        retryRef.current++
        tryNextPlayer()
      } else {
        setError(t('player.error'))
        setIsLoading(false)
      }
    }, LOADING_TIMEOUT_MS)
  }, [])

  const destroyPlayers = useCallback(() => {
    clearLoadTimeout()
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null }
    if (mpegtsRef.current) { try { mpegtsRef.current.destroy() } catch {} ; mpegtsRef.current = null }
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.removeAttribute('src')
      videoRef.current.load()
    }
  }, [])

  const tryHLS = useCallback((url: string) => {
    const video = videoRef.current!
    setPlayerTypeLabel('HLS.js')

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 60,
        maxBufferLength: 20,
        debug: false
      })
      hlsRef.current = hls
      hls.loadSource(url)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        clearLoadTimeout()
        setIsLoading(false)
        if (autoPlay) video.play().catch(() => {})
      })

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          if (retryRef.current === 0) {
            retryRef.current = 1
            hls.startLoad()
          } else {
            // HLS failed, try native
            destroyPlayers()
            tryNative(url)
          }
        }
      })
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      setPlayerTypeLabel('HLS Native')
      tryNative(url)
    } else {
      tryNative(url)
    }
  }, [autoPlay, destroyPlayers])

  const tryMpegTS = useCallback((url: string) => {
    const video = videoRef.current!
    setPlayerTypeLabel('MPEG-TS')

    if (!mpegts.getFeatureList().mseLivePlayback) {
      tryNative(url)
      return
    }

    try {
      const player = mpegts.createPlayer({
        type: 'mpegts', url, isLive: true, cors: true
      }, {
        enableWorker: true,
        liveSync: true,
        lazyLoadMaxDuration: 180
      })
      mpegtsRef.current = player
      player.attachMediaElement(video)
      player.load()

      player.on(mpegts.Events.ERROR, () => {
        destroyPlayers()
        tryNative(url)
      })

      player.on(mpegts.Events.STATISTICS_INFO, () => {
        clearLoadTimeout()
        setIsLoading(false)
      })

      if (autoPlay) player.play().catch(() => {})
    } catch {
      tryNative(url)
    }
  }, [autoPlay, destroyPlayers])

  const tryNative = useCallback((url: string) => {
    const video = videoRef.current!
    setPlayerTypeLabel('Native')
    video.src = url
    video.load()
    if (autoPlay) video.play().catch(() => {})
  }, [autoPlay])

  const tryNextPlayer = useCallback(() => {
    const url = channel.url
    const detected = detectStreamType(url)

    if (retryRef.current === 1) {
      // Second attempt: try a different player type
      if (detected === 'hls') {
        tryNative(url)
      } else {
        tryHLS(url)
      }
    } else {
      tryNative(url)
    }
  }, [channel.url, tryHLS, tryNative])

  const initPlayer = useCallback(() => {
    if (!videoRef.current || !channel.url) return
    destroyPlayers()
    setIsLoading(true)
    setError(null)
    retryRef.current = 0

    const detected = detectStreamType(channel.url)
    const type = playerType === 'auto' ? detected : playerType

    startLoadTimeout()

    if (type === 'hls' || channel.url.includes('.m3u8')) {
      tryHLS(channel.url)
    } else if (type === 'mpegts') {
      tryMpegTS(channel.url)
    } else {
      tryNative(channel.url)
    }
  }, [channel.url, playerType, destroyPlayers, tryHLS, tryMpegTS, tryNative, startLoadTimeout])

  useEffect(() => {
    notifiedRef.current = false
    initPlayer()
    window.electronAPI?.addHistory(channel).catch(() => {})
    // Set tray channel name — cleared on unmount
    window.electronAPI?.setCurrentChannel(channel.name).catch(() => {})
    return () => {
      destroyPlayers()
      window.electronAPI?.setCurrentChannel(null).catch(() => {})
    }
  }, [channel.id])

  // Video element events
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const onWaiting = () => setIsLoading(true)
    const onPlaying = () => {
      clearLoadTimeout()
      setIsLoading(false)
      setIsPlaying(true)
      // Notify only on first successful play, not on every buffering resume
      if (!notifiedRef.current) {
        notifiedRef.current = true
        window.electronAPI?.showNotification('Now Playing', channel.name).catch(() => {})
      }
    }
    const onPause = () => setIsPlaying(false)
    const onCanPlay = () => { clearLoadTimeout(); setIsLoading(false) }
    const onError = () => {
      if (retryRef.current < 2) {
        retryRef.current++
        tryNextPlayer()
      } else {
        setError(t('player.error'))
        setIsLoading(false)
      }
    }
    const onStalled = () => {
      // Restart load timeout if stalled
      startLoadTimeout()
    }

    video.addEventListener('waiting', onWaiting)
    video.addEventListener('playing', onPlaying)
    video.addEventListener('pause', onPause)
    video.addEventListener('canplay', onCanPlay)
    video.addEventListener('error', onError)
    video.addEventListener('stalled', onStalled)

    return () => {
      video.removeEventListener('waiting', onWaiting)
      video.removeEventListener('playing', onPlaying)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('canplay', onCanPlay)
      video.removeEventListener('error', onError)
      video.removeEventListener('stalled', onStalled)
    }
  }, [tryNextPlayer, t, startLoadTimeout])

  // Fullscreen sync
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const togglePlay = useCallback(() => {
    const v = videoRef.current
    if (!v || isLoading) return
    if (v.paused) v.play().catch(() => {})
    else v.pause()
  }, [isLoading])

  const handleVolumeChange = useCallback((v: number) => {
    setVolume(v)
    if (videoRef.current) videoRef.current.volume = v / 100
  }, [])

  const toggleMute = useCallback(() => {
    setIsMuted(m => {
      if (videoRef.current) videoRef.current.muted = !m
      return !m
    })
  }, [])

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) await containerRef.current.requestFullscreen()
    else await document.exitFullscreen()
  }, [])

  const togglePiP = useCallback(async () => {
    if (!videoRef.current) return
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture()
      else await videoRef.current.requestPictureInPicture()
    } catch {}
  }, [])

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black"
      onDoubleClick={toggleFullscreen}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        autoPlay={autoPlay}
      />

      {/* Loading spinner (small, non-blocking) */}
      <AnimatePresence>
        {isLoading && !error && (
          <motion.div
            className="absolute bottom-28 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div className="flex items-center gap-3 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/10">
              <div className="w-4 h-4 border-2 border-accent-700 border-t-accent-400 rounded-full animate-spin flex-shrink-0" />
              <span className="text-white text-sm">{t('player.loading')}</span>
              <span className="text-slate-500 text-xs">· {playerTypeLabel}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error overlay — always has back button */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 z-20"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            {/* Always-visible back in error state */}
            <div className="absolute top-3 left-3">
              <button
                onClick={onBack}
                className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all border border-white/10"
              >
                <ArrowLeft size={16} />
                <span className="text-sm">{t('player.back')}</span>
              </button>
            </div>

            <AlertTriangle className="text-red-400 mb-4" size={48} />
            <h3 className="text-white text-xl font-semibold mb-1">{t('player.error')}</h3>
            <p className="text-slate-400 text-sm mb-2">{t('player.errorDesc')}</p>
            <p className="text-slate-500 text-xs mb-6">{channel.url.substring(0, 60)}...</p>
            <div className="flex gap-3">
              <button
                onClick={initPlayer}
                className="flex items-center gap-2 px-5 py-2.5 bg-accent-600 hover:bg-accent-500 text-white rounded-xl transition-colors active:scale-95"
              >
                <RefreshCw size={16} />
                {t('player.retry')}
              </button>
              <button
                onClick={onBack}
                className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors active:scale-95"
              >
                {t('player.back')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls overlay */}
      {!error && (
        <PlayerControls
          channel={channel}
          isPlaying={isPlaying}
          isLoading={isLoading}
          isMuted={isMuted}
          volume={volume}
          isFullscreen={isFullscreen}
          playerTypeLabel={playerTypeLabel}
          onTogglePlay={togglePlay}
          onVolumeChange={handleVolumeChange}
          onToggleMute={toggleMute}
          onToggleFullscreen={toggleFullscreen}
          onTogglePiP={togglePiP}
          onBack={onBack}
          onRetry={initPlayer}
        />
      )}
    </div>
  )
}
