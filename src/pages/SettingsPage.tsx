import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Shield, Monitor, Cpu, Globe, Info, ChevronRight, Database, RefreshCw, Trash2, CheckCircle } from 'lucide-react'
import { useStore } from '../store'
import { ParentalControlPanel } from '../components/Settings/ParentalControlPanel'
import { DisplayPanel } from '../components/Settings/DisplayPanel'
import { useChannels } from '../hooks/useChannels'

type Panel = 'parental' | 'display' | 'player' | 'cache' | 'about' | null

export function SettingsPage() {
  const { t } = useTranslation()
  const { settings, setSettings } = useStore()
  const [activePanel, setActivePanel] = useState<Panel>(null)

  const SECTIONS = [
    {
      id: 'parental' as Panel,
      icon: Shield,
      label: t('settings.parentalControl'),
      desc: t('parental.title'),
      color: 'text-purple-400',
      bg: 'bg-purple-500/10'
    },
    {
      id: 'display' as Panel,
      icon: Monitor,
      label: t('display.title'),
      desc: t('display.selectScreen'),
      color: 'text-blue-400',
      bg: 'bg-blue-500/10'
    },
    {
      id: 'player' as Panel,
      icon: Cpu,
      label: t('settings.player'),
      desc: 'HLS, MPEG-TS, Native',
      color: 'text-green-400',
      bg: 'bg-green-500/10'
    },
    {
      id: 'cache' as Panel,
      icon: Database,
      label: 'Channel Cache',
      desc: 'Manage local channel database',
      color: 'text-teal-400',
      bg: 'bg-teal-500/10'
    },
    {
      id: 'about' as Panel,
      icon: Info,
      label: t('settings.about'),
      desc: 'IPTV PlayerX v1.0.0',
      color: 'text-slate-400',
      bg: 'bg-slate-500/10'
    }
  ]

  if (activePanel === 'parental') {
    return <ParentalControlPanel onBack={() => setActivePanel(null)} />
  }

  if (activePanel === 'display') {
    return <DisplayPanel onBack={() => setActivePanel(null)} />
  }

  if (activePanel === 'player') {
    return <PlayerSettingsPanel settings={settings} setSettings={setSettings} onBack={() => setActivePanel(null)} />
  }

  if (activePanel === 'cache') {
    return <CachePanel onBack={() => setActivePanel(null)} />
  }

  if (activePanel === 'about') {
    return <AboutPanel onBack={() => setActivePanel(null)} />
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-white text-2xl font-bold mb-8">{t('settings.title')}</h1>

      <div className="space-y-3">
        {SECTIONS.map((section, i) => (
          <motion.button
            key={section.id}
            onClick={() => setActivePanel(section.id)}
            className="w-full flex items-center gap-4 p-4 bg-bg-card hover:bg-bg-hover border border-white/5 hover:border-accent-600/30 rounded-2xl transition-all text-left"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            whileHover={{ x: 4 }}
          >
            <div className={`w-11 h-11 ${section.bg} rounded-xl flex items-center justify-center`}>
              <section.icon className={section.color} size={22} />
            </div>
            <div className="flex-1">
              <p className="text-white font-medium">{section.label}</p>
              <p className="text-slate-400 text-sm mt-0.5">{section.desc}</p>
            </div>
            <ChevronRight className="text-slate-500" size={18} />
          </motion.button>
        ))}
      </div>
    </div>
  )
}

function PlayerSettingsPanel({ settings, setSettings, onBack }: any) {
  const { t } = useTranslation()
  const types = [
    { value: 'auto', label: t('playerTypes.auto'), desc: 'Automatically detect the best player' },
    { value: 'hls', label: t('playerTypes.hls'), desc: 'Best for .m3u8 streams' },
    { value: 'mpegts', label: t('playerTypes.mpegts'), desc: 'Best for MPEG-TS streams' },
    { value: 'native', label: t('playerTypes.native'), desc: 'HTML5 native player fallback' }
  ]

  const save = async (type: string) => {
    setSettings({ player_type: type as any })
    await window.electronAPI?.setSetting('player_type', type)
  }

  return (
    <div className="p-8 max-w-2xl">
      <button onClick={onBack} className="text-slate-400 hover:text-white text-sm mb-6 flex items-center gap-2 transition-colors">
        ← {t('common.back')}
      </button>
      <h2 className="text-white text-2xl font-bold mb-6">{t('settings.player')}</h2>
      <div className="space-y-3">
        {types.map(type => (
          <button
            key={type.value}
            onClick={() => save(type.value)}
            className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${
              settings.player_type === type.value
                ? 'bg-accent-600/20 border-accent-600/40 text-accent-400'
                : 'bg-bg-card border-white/5 text-white hover:border-white/20'
            }`}
          >
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
              settings.player_type === type.value ? 'border-accent-500' : 'border-slate-600'
            }`}>
              {settings.player_type === type.value && <div className="w-2 h-2 bg-accent-500 rounded-full" />}
            </div>
            <div>
              <p className="font-medium">{type.label}</p>
              <p className="text-slate-400 text-sm">{type.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function AboutPanel({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="p-8 max-w-2xl">
      <button onClick={onBack} className="text-slate-400 hover:text-white text-sm mb-6 flex items-center gap-2 transition-colors">
        ← {t('common.back')}
      </button>
      <div className="text-center py-8">
        <div className="w-20 h-20 bg-accent-700/40 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-4xl">📺</span>
        </div>
        <h2 className="text-white text-2xl font-bold">IPTV PlayerX</h2>
        <p className="text-accent-400 text-sm mt-1">Version 1.0.0</p>
        <p className="text-slate-400 text-sm mt-4 max-w-sm mx-auto">
          A modern, open-source IPTV player with parental controls, multi-source support, and Chromecast casting.
        </p>
        <div className="mt-8 p-4 bg-bg-card border border-white/5 rounded-xl text-left space-y-2">
          <InfoRow label="Built with" value="Electron + React" />
          <InfoRow label="Video" value="HLS.js + MPEG-TS.js" />
          <InfoRow label="Source" value="IPTV-org API" />
          <InfoRow label="License" value="MIT" />
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="text-white font-medium">{value}</span>
    </div>
  )
}

function CachePanel({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation()
  const { reload } = useChannels()
  const [info, setInfo] = useState<{ count: number; cachedAt: string | null; ageHours: number } | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [done, setDone] = useState<string | null>(null)

  const load = async () => {
    const i = await window.electronAPI?.getCacheInfo()
    if (i) setInfo(i)
  }

  useEffect(() => { load() }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    setDone(null)
    await reload()
    await load()
    setRefreshing(false)
    setDone('Channels updated from API!')
    setTimeout(() => setDone(null), 3000)
  }

  const handleClear = async () => {
    setClearing(true)
    await window.electronAPI?.clearChannelsCache()
    await load()
    setClearing(false)
    setDone('Cache cleared. Channels will reload from API next time.')
    setTimeout(() => setDone(null), 4000)
  }

  const ageLabel = info
    ? info.ageHours < 1
      ? 'Less than 1 hour ago'
      : info.ageHours < 24
        ? `${Math.floor(info.ageHours)} hours ago`
        : `${Math.floor(info.ageHours / 24)} days ago`
    : '—'

  return (
    <div className="p-8 max-w-2xl">
      <button onClick={onBack} className="text-slate-400 hover:text-white text-sm mb-6 flex items-center gap-2 transition-colors">
        ← {t('common.back')}
      </button>

      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-teal-500/20 rounded-2xl flex items-center justify-center">
          <Database className="text-teal-400" size={24} />
        </div>
        <div>
          <h2 className="text-white text-2xl font-bold">Channel Cache</h2>
          <p className="text-slate-400 text-sm">Local SQLite database</p>
        </div>
      </div>

      {/* Status card */}
      <div className="p-5 bg-bg-card border border-white/5 rounded-2xl mb-4 space-y-3">
        <InfoRow label="Channels stored" value={info ? info.count.toLocaleString() : '…'} />
        <InfoRow label="Last updated" value={ageLabel} />
        <InfoRow
          label="Cache status"
          value={info && info.count > 0 && info.ageHours < 24 ? '✅ Fresh' : info && info.count > 0 ? '⚠️ Stale (>24h)' : '❌ Empty'}
        />
      </div>

      {/* Explanation */}
      <div className="p-4 bg-teal-500/5 border border-teal-500/20 rounded-xl mb-6 text-sm text-teal-300 space-y-1">
        <p>💡 <strong>First launch:</strong> fetches ~7,000 channels from IPTV-org API (~5-10s)</p>
        <p>⚡ <strong>Subsequent launches:</strong> loads from local SQLite instantly (&lt;1s)</p>
        <p>🔄 <strong>Auto-refresh:</strong> background update when cache is older than 6 hours</p>
      </div>

      {done && (
        <motion.div
          className="flex items-center gap-2 p-3 mb-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm"
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        >
          <CheckCircle size={16} /> {done}
        </motion.div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-accent-600 hover:bg-accent-500 disabled:opacity-50 text-white rounded-xl transition-colors font-medium"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          {refreshing ? 'Fetching from API…' : 'Refresh from API'}
        </button>
        <button
          onClick={handleClear}
          disabled={clearing || !info?.count}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 disabled:opacity-40 text-red-400 rounded-xl transition-colors"
        >
          <Trash2 size={16} className={clearing ? 'animate-spin' : ''} />
          Clear
        </button>
      </div>
    </div>
  )
}
