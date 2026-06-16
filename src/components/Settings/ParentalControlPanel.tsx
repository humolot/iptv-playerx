import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Shield, Lock, Unlock, Eye, EyeOff, ToggleLeft, ToggleRight, Check, X } from 'lucide-react'
import { useStore } from '../../store'
import { Modal } from '../common/Modal'
import { PINPad } from '../common/PINPad'

const EMPTY_PARENTAL = {
  enabled: false,
  pin_hash: null,
  block_adult: true,
  blocked_categories: [] as string[],
  blocked_channels: [] as string[]
}

interface Props { onBack: () => void }

export function ParentalControlPanel({ onBack }: Props) {
  const { t } = useTranslation()
  const { parentalControl, setParentalControl, isParentalUnlocked, setParentalUnlocked, setPIN, categories } = useStore()
  const [showSetPIN, setShowSetPIN] = useState(false)
  const [showVerifyPIN, setShowVerifyPIN] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [pinError, setPinError] = useState(false)
  const [newPIN, setNewPIN] = useState('')
  const [pinStep, setPinStep] = useState<'new' | 'confirm'>('new')
  const [saved, setSaved] = useState(false)
  const { verifyPIN } = useStore()

  const toggleEnabled = async () => {
    if (!parentalControl.enabled && !parentalControl.pin_hash) {
      setShowSetPIN(true)
      return
    }
    if (parentalControl.enabled && !isParentalUnlocked) {
      setShowVerifyPIN(true)
      return
    }
    const next = { ...parentalControl, enabled: !parentalControl.enabled }
    setParentalControl(next)
    await window.electronAPI?.setParentalControl(next)
  }

  const toggleBlockAdult = async () => {
    const next = { ...parentalControl, block_adult: !parentalControl.block_adult }
    setParentalControl(next)
    await window.electronAPI?.setParentalControl(next)
  }

  const toggleCategory = async (cat: string) => {
    const blocked = parentalControl.blocked_categories
    const next = blocked.includes(cat) ? blocked.filter(c => c !== cat) : [...blocked, cat]
    const updated = { ...parentalControl, blocked_categories: next }
    setParentalControl(updated)
    await window.electronAPI?.setParentalControl(updated)
  }

  const handleSetPIN = (pin: string) => {
    if (pinStep === 'new') {
      setNewPIN(pin)
      setPinStep('confirm')
    } else {
      if (pin === newPIN) {
        // setPIN hashes via simpleHash and saves to both store and SQLite
        setPIN(pin)
        // Get the updated store state (pin_hash is now the simpleHash, not btoa)
        const next = { ...useStore.getState().parentalControl, enabled: true }
        setParentalControl(next)
        window.electronAPI?.setParentalControl(next)
        setShowSetPIN(false)
        setPinStep('new')
        setNewPIN('')
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      } else {
        setPinError(true)
        setPinStep('new')
        setNewPIN('')
        setTimeout(() => setPinError(false), 2000)
      }
    }
  }

  const handleEmergencyReset = async () => {
    setParentalControl(EMPTY_PARENTAL)
    setParentalUnlocked(false)
    await window.electronAPI?.setParentalControl(EMPTY_PARENTAL)
    setShowReset(false)
    setShowVerifyPIN(false)
  }

  const handleVerifyPIN = (pin: string) => {
    if (verifyPIN(pin)) {
      setParentalUnlocked(true)
      setShowVerifyPIN(false)
      const next = { ...parentalControl, enabled: false }
      setParentalControl(next)
      window.electronAPI?.setParentalControl(next)
    } else {
      setPinError(true)
      setTimeout(() => setPinError(false), 1500)
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <button onClick={onBack} className="text-slate-400 hover:text-white text-sm mb-6 flex items-center gap-2 transition-colors">
        ← {t('common.back')}
      </button>

      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-purple-500/20 rounded-2xl flex items-center justify-center">
          <Shield className="text-purple-400" size={24} />
        </div>
        <div>
          <h2 className="text-white text-2xl font-bold">{t('parental.title')}</h2>
          <p className="text-slate-400 text-sm">{parentalControl.enabled ? t('parental.locked') : 'Inactive'}</p>
        </div>
        {saved && (
          <motion.div
            className="ml-auto flex items-center gap-1 text-green-400 text-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <Check size={14} /> {t('parental.pinSet')}
          </motion.div>
        )}
      </div>

      <div className="space-y-4">
        {/* Enable toggle */}
        <div className="p-4 bg-bg-card border border-white/5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-white font-medium">{t('parental.enable')}</p>
            <p className="text-slate-400 text-sm mt-0.5">
              {parentalControl.pin_hash ? 'PIN is set' : 'No PIN configured'}
            </p>
          </div>
          <button onClick={toggleEnabled} className={parentalControl.enabled ? 'text-accent-400' : 'text-slate-500'}>
            {parentalControl.enabled ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
          </button>
        </div>

        {/* Change PIN */}
        <button
          onClick={() => { setPinStep('new'); setShowSetPIN(true) }}
          className="w-full p-4 bg-bg-card hover:bg-bg-hover border border-white/5 rounded-2xl flex items-center justify-between transition-colors"
        >
          <div className="flex items-center gap-3">
            <Lock className="text-accent-400" size={18} />
            <span className="text-white">{parentalControl.pin_hash ? t('parental.changePIN') : t('parental.setPIN')}</span>
          </div>
          <span className="text-slate-500 text-sm">→</span>
        </button>

        {/* Unlock session */}
        {parentalControl.enabled && (
          <button
            onClick={() => isParentalUnlocked ? setParentalUnlocked(false) : setShowVerifyPIN(true)}
            className={`w-full p-4 border rounded-2xl flex items-center justify-between transition-colors ${
              isParentalUnlocked
                ? 'bg-green-500/10 border-green-500/20 hover:bg-green-500/20'
                : 'bg-bg-card border-white/5 hover:bg-bg-hover'
            }`}
          >
            <div className="flex items-center gap-3">
              {isParentalUnlocked
                ? <Unlock className="text-green-400" size={18} />
                : <Lock className="text-slate-400" size={18} />
              }
              <span className={isParentalUnlocked ? 'text-green-400' : 'text-white'}>
                {isParentalUnlocked ? 'Session Unlocked (click to lock)' : t('parental.unlock')}
              </span>
            </div>
          </button>
        )}

        {/* Block adult */}
        {parentalControl.enabled && (
          <div className="p-4 bg-bg-card border border-white/5 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-white font-medium">{t('parental.blockAdult')}</p>
              <p className="text-slate-400 text-sm mt-0.5">Blocks channels with adult keywords</p>
            </div>
            <button onClick={toggleBlockAdult} className={parentalControl.block_adult ? 'text-accent-400' : 'text-slate-500'}>
              {parentalControl.block_adult ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
            </button>
          </div>
        )}

        {/* Blocked categories */}
        {parentalControl.enabled && categories.length > 0 && (
          <div className="p-4 bg-bg-card border border-white/5 rounded-2xl">
            <p className="text-white font-medium mb-3">{t('parental.blockedCategories')}</p>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => {
                const isBlocked = parentalControl.blocked_categories.includes(cat)
                return (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isBlocked
                        ? 'bg-red-500/20 border border-red-500/30 text-red-400'
                        : 'bg-bg-hover border border-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    {isBlocked && <X size={10} className="inline mr-1" />}
                    {cat}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Set PIN Modal */}
      <Modal isOpen={showSetPIN} onClose={() => { setShowSetPIN(false); setPinStep('new'); setNewPIN('') }} hideClose>
        <div className="py-4">
          <h3 className="text-white text-lg font-semibold text-center mb-2">
            {pinStep === 'new' ? t('parental.newPIN') : t('parental.confirmPIN')}
          </h3>
          <p className="text-slate-400 text-sm text-center mb-6">
            {pinStep === 'new' ? 'Enter a 4-digit PIN' : 'Enter the PIN again to confirm'}
          </p>
          <PINPad onSubmit={handleSetPIN} error={pinError} />
        </div>
      </Modal>

      {/* Verify PIN Modal */}
      <Modal isOpen={showVerifyPIN} onClose={() => setShowVerifyPIN(false)} hideClose>
        <div className="py-4">
          <h3 className="text-white text-lg font-semibold text-center mb-6">{t('parental.enterPIN')}</h3>
          <PINPad onSubmit={handleVerifyPIN} error={pinError} />
          <button
            onClick={() => { setShowVerifyPIN(false); setShowReset(true) }}
            className="w-full mt-6 text-center text-slate-500 hover:text-red-400 text-xs transition-colors"
          >
            Forgot PIN? Reset parental controls
          </button>
        </div>
      </Modal>

      {/* Emergency Reset Confirmation */}
      <Modal isOpen={showReset} onClose={() => setShowReset(false)}>
        <div className="py-4 text-center">
          <div className="w-14 h-14 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="text-red-400" size={26} />
          </div>
          <h3 className="text-white text-lg font-bold mb-2">Reset Parental Controls</h3>
          <p className="text-slate-400 text-sm mb-6 max-w-xs mx-auto">
            This will disable parental controls and clear your PIN. You can set a new PIN afterwards.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowReset(false)}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleEmergencyReset}
              className="flex-1 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 font-medium transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
