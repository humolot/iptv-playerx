import { useState } from 'react'
import { motion } from 'framer-motion'
import { Delete, Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface Props {
  onSubmit: (pin: string) => void
  error?: boolean
  maxLength?: number
}

export function PINPad({ onSubmit, error, maxLength = 4 }: Props) {
  const { t } = useTranslation()
  const [pin, setPin] = useState('')

  const handleDigit = (d: string) => {
    if (pin.length >= maxLength) return
    const newPin = pin + d
    setPin(newPin)
    if (newPin.length === maxLength) {
      setTimeout(() => {
        onSubmit(newPin)
        setPin('')
      }, 100)
    }
  }

  const handleDelete = () => setPin(p => p.slice(0, -1))

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex items-center gap-2 text-slate-400">
        <Lock size={16} />
        <span className="text-sm">{t('parental.enterPIN')}</span>
      </div>

      {/* Dots */}
      <div className="flex gap-3">
        {Array.from({ length: maxLength }).map((_, i) => (
          <motion.div
            key={i}
            className={`w-4 h-4 rounded-full border-2 transition-colors ${
              i < pin.length
                ? error ? 'bg-red-500 border-red-500' : 'bg-accent-500 border-accent-500'
                : 'border-slate-600 bg-transparent'
            }`}
            animate={error && i < pin.length ? { x: [-4, 4, -4, 4, 0] } : {}}
            transition={{ duration: 0.3 }}
          />
        ))}
      </div>

      {error && (
        <motion.p
          className="text-red-400 text-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        >
          {t('parental.wrongPIN')}
        </motion.p>
      )}

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-2">
        {['1','2','3','4','5','6','7','8','9'].map(d => (
          <button
            key={d}
            onClick={() => handleDigit(d)}
            className="w-16 h-16 rounded-xl bg-bg-hover hover:bg-white/10 text-white text-xl font-medium transition-all hover:scale-95 active:scale-90"
          >
            {d}
          </button>
        ))}
        <div /> {/* Empty */}
        <button
          onClick={() => handleDigit('0')}
          className="w-16 h-16 rounded-xl bg-bg-hover hover:bg-white/10 text-white text-xl font-medium transition-all hover:scale-95 active:scale-90"
        >
          0
        </button>
        <button
          onClick={handleDelete}
          className="w-16 h-16 rounded-xl bg-bg-hover hover:bg-white/10 text-slate-400 flex items-center justify-center transition-all hover:scale-95 active:scale-90"
        >
          <Delete size={20} />
        </button>
      </div>
    </div>
  )
}
