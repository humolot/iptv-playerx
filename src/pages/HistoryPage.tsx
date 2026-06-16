import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { History, Trash2 } from 'lucide-react'
import { useStore } from '../store'
import { ChannelLogo } from '../components/common/ChannelLogo'

export function HistoryPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { history, setHistory } = useStore()

  useEffect(() => {
    window.electronAPI?.getHistory(100).then(rows => {
      setHistory(rows.map((r: any) => ({
        id: r.channel_id,
        name: r.channel_name,
        url: r.channel_url,
        logo: r.logo_url || undefined,
        group: r.group_title || undefined
      })))
    })
  }, [])

  const clearHistory = async () => {
    await window.electronAPI?.clearHistory()
    setHistory([])
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 bg-bg-card rounded-2xl flex items-center justify-center mx-auto mb-4">
            <History className="text-slate-500" size={36} />
          </div>
          <h2 className="text-white text-xl font-semibold">{t('history.empty')}</h2>
          <p className="text-slate-400 text-sm mt-2">{t('history.emptyDesc')}</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-white text-2xl font-bold">{t('history.title')}</h1>
        <button
          onClick={clearHistory}
          className="flex items-center gap-2 px-4 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 rounded-xl text-sm transition-colors"
        >
          <Trash2 size={14} />
          {t('history.clear')}
        </button>
      </div>

      <div className="space-y-2">
        {history.map((channel, i) => (
          <motion.button
            key={`${channel.id}-${i}`}
            onClick={() => navigate(`/player/${encodeURIComponent(channel.id)}`, { state: { channel } })}
            className="w-full flex items-center gap-4 p-3 rounded-xl bg-bg-card hover:bg-bg-hover border border-white/5 hover:border-accent-600/30 transition-all text-left"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.5) }}
            whileHover={{ x: 4 }}
          >
            <ChannelLogo channel={channel} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{channel.name}</p>
              <p className="text-slate-400 text-xs truncate">{channel.group}</p>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  )
}
