import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useEffect } from 'react'
import { useStore } from '../store'
import { VideoPlayer } from '../components/Player/VideoPlayer'
import { Channel } from '../types'

export function PlayerPage() {
  const { state } = useLocation()
  const { id } = useParams()
  const navigate = useNavigate()
  const { settings, channels, setCurrentChannel } = useStore()

  // Channel can come from navigation state or be found by id
  const channel: Channel | null = state?.channel || channels.find(c => c.id === id) || null

  useEffect(() => {
    setCurrentChannel(channel)
    return () => setCurrentChannel(null)
  }, [channel?.id])

  if (!channel) {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-white text-xl mb-4">Channel not found</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-accent-600 hover:bg-accent-500 text-white rounded-xl transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-screen bg-black">
      <VideoPlayer
        channel={channel}
        playerType={settings.player_type || 'auto'}
        onBack={() => navigate(-1)}
        autoPlay
      />
    </div>
  )
}
