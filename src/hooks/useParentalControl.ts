import { useState, useCallback } from 'react'
import { useStore } from '../store'
import { Channel, ParentalControl } from '../types'

const EMPTY_PARENTAL: ParentalControl = {
  enabled: false,
  pin_hash: null,
  block_adult: true,
  blocked_categories: [],
  blocked_channels: []
}

export function useParentalControl() {
  const { parentalControl, isParentalUnlocked, verifyPIN, setPIN, setParentalUnlocked, isChannelBlocked, setParentalControl } = useStore()
  const [pendingChannel, setPendingChannel] = useState<Channel | null>(null)
  const [showPINModal, setShowPINModal] = useState(false)
  const [pinError, setPinError] = useState(false)

  const tryWatchChannel = useCallback((channel: Channel, onUnlocked: (ch: Channel) => void) => {
    if (!isChannelBlocked(channel)) {
      onUnlocked(channel)
      return
    }
    setPendingChannel(channel)
    setShowPINModal(true)
  }, [isChannelBlocked])

  const submitPIN = useCallback((pin: string, onSuccess?: () => void) => {
    if (verifyPIN(pin)) {
      setParentalUnlocked(true)
      setPinError(false)
      setShowPINModal(false)
      if (onSuccess) onSuccess()
      return true
    } else {
      setPinError(true)
      return false
    }
  }, [verifyPIN, setParentalUnlocked])

  const lock = useCallback(() => {
    setParentalUnlocked(false)
  }, [setParentalUnlocked])

  const closePINModal = useCallback(() => {
    setShowPINModal(false)
    setPendingChannel(null)
    setPinError(false)
  }, [])

  const emergencyReset = useCallback(async () => {
    setParentalControl(EMPTY_PARENTAL)
    setParentalUnlocked(false)
    setShowPINModal(false)
    setPendingChannel(null)
    await window.electronAPI?.setParentalControl(EMPTY_PARENTAL)
  }, [setParentalControl, setParentalUnlocked])

  return {
    parentalControl,
    isParentalUnlocked,
    pendingChannel,
    showPINModal,
    pinError,
    tryWatchChannel,
    submitPIN,
    lock,
    closePINModal,
    emergencyReset,
    setPIN,
    isChannelBlocked
  }
}
