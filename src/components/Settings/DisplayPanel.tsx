import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Monitor, CheckCircle } from 'lucide-react'
import { useStore } from '../../store'
import { LoadingSpinner } from '../common/LoadingSpinner'

interface Props { onBack: () => void }

export function DisplayPanel({ onBack }: Props) {
  const { t } = useTranslation()
  const { displays, setDisplays, settings, setSettings } = useStore()

  useEffect(() => {
    window.electronAPI?.getScreens().then(setDisplays)
  }, [])

  const moveToScreen = async (index: number) => {
    setSettings({ display_index: String(index) })
    await window.electronAPI?.moveToScreen(index)
    await window.electronAPI?.setSetting('display_index', String(index))
  }

  return (
    <div className="p-8 max-w-2xl">
      <button onClick={onBack} className="text-slate-400 hover:text-white text-sm mb-6 flex items-center gap-2 transition-colors">
        ← {t('common.back')}
      </button>

      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center">
          <Monitor className="text-blue-400" size={24} />
        </div>
        <h2 className="text-white text-2xl font-bold">{t('display.title')}</h2>
      </div>

      {displays.length === 0 ? (
        <div className="py-8 flex justify-center"><LoadingSpinner /></div>
      ) : (
        <div className="space-y-3">
          {displays.map(display => {
            const isActive = String(display.index) === settings.display_index || (display.isPrimary && !settings.display_index)
            return (
              <motion.button
                key={display.id}
                onClick={() => moveToScreen(display.index)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${
                  isActive
                    ? 'bg-blue-500/10 border-blue-500/30'
                    : 'bg-bg-card border-white/5 hover:border-white/20'
                }`}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isActive ? 'bg-blue-500/20' : 'bg-bg-hover'}`}>
                  <Monitor className={isActive ? 'text-blue-400' : 'text-slate-400'} size={22} />
                </div>
                <div className="flex-1">
                  <p className={`font-medium ${isActive ? 'text-blue-400' : 'text-white'}`}>
                    {display.label}
                    {display.isPrimary && (
                      <span className="ml-2 px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                        {t('display.primary')}
                      </span>
                    )}
                  </p>
                  <p className="text-slate-400 text-sm mt-0.5">
                    {display.width} × {display.height}
                    {display.scaleFactor !== 1 && ` @ ${display.scaleFactor}x`}
                  </p>
                </div>
                {isActive && <CheckCircle className="text-blue-400" size={20} />}
              </motion.button>
            )
          })}
        </div>
      )}

      <p className="text-slate-500 text-xs mt-6">{t('display.moveToScreen')}: click a screen above to move the app window.</p>
    </div>
  )
}
