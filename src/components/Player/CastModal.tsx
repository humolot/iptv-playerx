import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Tv2, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Modal } from '../common/Modal'
import { LoadingSpinner } from '../common/LoadingSpinner'
import { Channel, CastDevice } from '../../types'

interface Props {
  isOpen: boolean
  onClose: () => void
  channel: Channel
}

export function CastModal({ isOpen, onClose, channel }: Props) {
  const { t } = useTranslation()
  const [devices, setDevices] = useState<CastDevice[]>([])
  const [searching, setSearching] = useState(false)
  const [casting, setCasting] = useState<string | null>(null)
  const [castResult, setCastResult] = useState<'success' | 'error' | null>(null)

  const search = async () => {
    setSearching(true)
    setDevices([])
    setCastResult(null)
    try {
      const found = await window.electronAPI?.discoverCastDevices() || []
      setDevices(found)
    } finally {
      setSearching(false)
    }
  }

  useEffect(() => {
    if (isOpen) search()
  }, [isOpen])

  const castTo = async (device: CastDevice) => {
    setCasting(device.id)
    setCastResult(null)
    const ok = await window.electronAPI?.castToDevice(device.id, channel.url, channel.name)
    setCastResult(ok ? 'success' : 'error')
    setCasting(null)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('cast.title')} size="sm">
      <div className="space-y-4">
        {searching ? (
          <div className="py-8 flex flex-col items-center">
            <LoadingSpinner text={t('cast.searching')} />
          </div>
        ) : devices.length === 0 ? (
          <div className="py-8 text-center">
            <Tv2 className="mx-auto text-slate-500 mb-3" size={32} />
            <p className="text-white font-medium">{t('cast.noDevices')}</p>
            <p className="text-slate-400 text-sm mt-1">{t('cast.noDevicesDesc')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {devices.map(device => (
              <motion.button
                key={device.id}
                onClick={() => castTo(device)}
                disabled={!!casting}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-bg-hover hover:bg-white/10 text-left transition-colors border border-white/5 disabled:opacity-60"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Tv2 className="text-accent-400" size={20} />
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{device.name}</p>
                  <p className="text-slate-400 text-xs">{device.ip}</p>
                </div>
                {casting === device.id && <LoadingSpinner size="sm" />}
                {castResult === 'success' && casting !== device.id && (
                  <CheckCircle className="text-green-400" size={18} />
                )}
                {castResult === 'error' && casting !== device.id && (
                  <AlertCircle className="text-red-400" size={18} />
                )}
              </motion.button>
            ))}
          </div>
        )}

        <button
          onClick={search}
          disabled={searching}
          className="w-full flex items-center justify-center gap-2 py-2 text-slate-400 hover:text-white text-sm transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={searching ? 'animate-spin' : ''} />
          {t('cast.refresh')}
        </button>

        {castResult === 'success' && (
          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-center">
            <p className="text-green-400 text-sm font-medium">{t('cast.castSuccess')}</p>
          </div>
        )}
      </div>
    </Modal>
  )
}
