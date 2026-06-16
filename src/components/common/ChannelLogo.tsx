import { useState } from 'react'
import { getChannelInitial, generateChannelColor } from '../../utils/m3u'

interface Props {
  channel: { id: string; name: string; logo?: string }
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizes = {
  sm: 'w-10 h-10 text-sm',
  md: 'w-16 h-16 text-xl',
  lg: 'w-24 h-24 text-3xl',
  xl: 'w-32 h-32 text-4xl'
}

export function ChannelLogo({ channel, className = '', size = 'md' }: Props) {
  const [imgError, setImgError] = useState(false)
  const bgColor = generateChannelColor(channel.id)
  const initial = getChannelInitial(channel.name)
  const sizeClass = sizes[size]

  if (channel.logo && !imgError) {
    return (
      <div className={`${sizeClass} ${className} overflow-hidden rounded-lg flex-shrink-0 bg-bg-card`}>
        <img
          src={channel.logo}
          alt={channel.name}
          className="w-full h-full object-contain p-1"
          onError={() => setImgError(true)}
          loading="lazy"
        />
      </div>
    )
  }

  return (
    <div
      className={`${sizeClass} ${className} rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-white`}
      style={{ background: `linear-gradient(135deg, ${bgColor}88, ${bgColor}44)`, border: `1px solid ${bgColor}44` }}
    >
      {initial}
    </div>
  )
}
