import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Plus, Trash2, RefreshCw, Globe, File, ToggleLeft, ToggleRight, CheckCircle, AlertCircle, Database } from 'lucide-react'
import { useStore } from '../store'
import { Modal } from '../components/common/Modal'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { normalizeChannels } from '../utils/m3u'
import { Source } from '../types'

type AddMode = 'url' | 'file' | null

export function SourcesPage() {
  const { t } = useTranslation()
  const { settings, setSettings, channels, setChannels, setCategories } = useStore()
  const [sources, setSources] = useState<Source[]>([])
  const [addMode, setAddMode] = useState<AddMode>(null)
  const [newName, setNewName] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [adding, setAdding] = useState(false)
  const [addResult, setAddResult] = useState<{ count: number } | { error: string } | null>(null)
  const iptvEnabled = settings.iptv_org_enabled === 'true'

  useEffect(() => {
    window.electronAPI?.getSources().then(setSources)
  }, [])

  const toggleIptvOrg = async () => {
    const next = !iptvEnabled
    setSettings({ iptv_org_enabled: next ? 'true' : 'false' })
    await window.electronAPI?.setSetting('iptv_org_enabled', next ? 'true' : 'false')
  }

  const addUrlSource = async () => {
    if (!newName || !newUrl) return
    setAdding(true)
    setAddResult(null)
    try {
      const parsed = await window.electronAPI?.parseM3UUrl(newUrl)
      if (!parsed) throw new Error('No channels')
      const normalized = normalizeChannels(parsed)
      const id = await window.electronAPI?.addSource({ name: newName, type: 'm3u-url', url: newUrl })
      const newChannels = normalized.map(c => ({ ...c, sourceId: id }))
      setChannels([...channels, ...newChannels])
      const cats = [...new Set([...channels, ...newChannels].map(c => c.group || 'General'))].sort()
      setCategories(cats)
      const newSource = { id, name: newName, type: 'm3u-url' as any, url: newUrl, enabled: true }
      setSources(s => [...s, newSource])
      setAddResult({ count: normalized.length })
      setNewName(''); setNewUrl(''); setAddMode(null)
    } catch (err: any) {
      setAddResult({ error: err.message || 'Failed' })
    } finally {
      setAdding(false)
    }
  }

  const addFileSource = async () => {
    setAdding(true)
    setAddResult(null)
    try {
      const result = await window.electronAPI?.parseM3UFile()
      if (!result) { setAdding(false); return }
      const normalized = normalizeChannels(result.channels)
      const name = newName || result.filePath.split(/[\\/]/).pop() || 'Local Playlist'
      const id = await window.electronAPI?.addSource({ name, type: 'm3u-file', filepath: result.filePath })
      const newChannels = normalized.map(c => ({ ...c, sourceId: id }))
      setChannels([...channels, ...newChannels])
      const cats = [...new Set([...channels, ...newChannels].map(c => c.group || 'General'))].sort()
      setCategories(cats)
      const newSource = { id, name, type: 'm3u-file' as any, filepath: result.filePath, enabled: true }
      setSources(s => [...s, newSource])
      setAddResult({ count: normalized.length })
      setNewName(''); setAddMode(null)
    } catch (err: any) {
      setAddResult({ error: err.message || 'Failed' })
    } finally {
      setAdding(false)
    }
  }

  const removeSource = async (id: number) => {
    await window.electronAPI?.removeSource(id)
    setSources(s => s.filter(src => src.id !== id))
    setChannels(channels.filter(c => c.sourceId !== id))
  }

  const toggleSource = async (id: number, enabled: boolean) => {
    await window.electronAPI?.toggleSource(id, enabled)
    setSources(s => s.map(src => src.id === id ? { ...src, enabled } : src))
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-white text-2xl font-bold mb-2">{t('sources.title')}</h1>
      <p className="text-slate-400 text-sm mb-8">{t('sources.emptyDesc')}</p>

      {/* IPTV-org built-in */}
      <div className="bg-bg-card border border-white/10 rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent-700/40 rounded-xl flex items-center justify-center">
              <Database className="text-accent-400" size={20} />
            </div>
            <div>
              <p className="text-white font-semibold">{t('sources.iptvOrg')}</p>
              <p className="text-slate-400 text-xs mt-0.5">{t('sources.iptvOrgDesc')}</p>
            </div>
          </div>
          <button
            onClick={toggleIptvOrg}
            className={`transition-colors ${iptvEnabled ? 'text-accent-400' : 'text-slate-500'}`}
          >
            {iptvEnabled ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
          </button>
        </div>
      </div>

      {/* User sources */}
      {sources.length > 0 && (
        <div className="space-y-3 mb-6">
          {sources.map(source => (
            <motion.div
              key={source.id}
              className="flex items-center gap-3 p-4 bg-bg-card border border-white/5 rounded-xl"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            >
              <div className="w-8 h-8 bg-bg-hover rounded-lg flex items-center justify-center">
                {source.type === 'm3u-url' ? <Globe size={16} className="text-accent-400" /> :
                  <File size={16} className="text-blue-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{source.name}</p>
                <p className="text-slate-500 text-xs truncate">{source.url || source.filepath}</p>
              </div>
              <button onClick={() => toggleSource(source.id, !source.enabled)} className={source.enabled ? 'text-accent-400' : 'text-slate-500'}>
                {source.enabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
              </button>
              <button
                onClick={() => removeSource(source.id)}
                className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add source buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => setAddMode('url')}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-bg-card hover:bg-bg-hover border border-white/10 hover:border-accent-600/40 text-white rounded-xl transition-all"
        >
          <Globe size={16} className="text-accent-400" />
          <span className="text-sm">{t('sources.m3uUrl')}</span>
        </button>
        <button
          onClick={() => setAddMode('file')}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-bg-card hover:bg-bg-hover border border-white/10 hover:border-accent-600/40 text-white rounded-xl transition-all"
        >
          <File size={16} className="text-blue-400" />
          <span className="text-sm">{t('sources.m3uFile')}</span>
        </button>
      </div>

      {/* Result feedback */}
      <AnimatePresence>
        {addResult && (
          <motion.div
            className={`mt-4 p-3 rounded-xl flex items-center gap-2 text-sm ${
              'error' in addResult
                ? 'bg-red-500/10 border border-red-500/20 text-red-400'
                : 'bg-green-500/10 border border-green-500/20 text-green-400'
            }`}
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          >
            {'error' in addResult
              ? <><AlertCircle size={16} /> {t('sources.loadError')}: {'error' in addResult ? addResult.error : ''}</>
              : <><CheckCircle size={16} /> {t('sources.loadSuccess', { count: 'count' in addResult ? addResult.count : 0 })}</>
            }
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add URL Modal */}
      <Modal isOpen={addMode === 'url'} onClose={() => { setAddMode(null); setNewName(''); setNewUrl('') }} title={t('sources.m3uUrl')}>
        <div className="space-y-4">
          <div>
            <label className="text-slate-400 text-sm mb-1 block">{t('sources.name')}</label>
            <input
              type="text" value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="My Playlist"
              className="w-full bg-bg-hover border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-accent-600 transition-colors"
            />
          </div>
          <div>
            <label className="text-slate-400 text-sm mb-1 block">{t('sources.url')}</label>
            <input
              type="url" value={newUrl} onChange={e => setNewUrl(e.target.value)}
              placeholder="http://..."
              className="w-full bg-bg-hover border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-accent-600 transition-colors"
            />
          </div>
          <button
            onClick={addUrlSource} disabled={adding || !newName || !newUrl}
            className="w-full py-2.5 bg-accent-600 hover:bg-accent-500 text-white rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {adding ? <><LoadingSpinner size="sm" /> {t('sources.loading')}</> : <><Plus size={16} /> {t('sources.add')}</>}
          </button>
        </div>
      </Modal>

      {/* Add File Modal */}
      <Modal isOpen={addMode === 'file'} onClose={() => { setAddMode(null); setNewName('') }} title={t('sources.m3uFile')}>
        <div className="space-y-4">
          <div>
            <label className="text-slate-400 text-sm mb-1 block">{t('sources.name')} (optional)</label>
            <input
              type="text" value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="My Local Playlist"
              className="w-full bg-bg-hover border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-accent-600 transition-colors"
            />
          </div>
          <button
            onClick={addFileSource} disabled={adding}
            className="w-full py-2.5 bg-accent-600 hover:bg-accent-500 text-white rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {adding ? <><LoadingSpinner size="sm" /> {t('sources.loading')}</> : <><File size={16} /> Browse File...</>}
          </button>
        </div>
      </Modal>
    </div>
  )
}
