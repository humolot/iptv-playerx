interface Props {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  text?: string
}

const sizes = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-12 h-12' }

export function LoadingSpinner({ size = 'md', className = '', text }: Props) {
  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      <div className={`${sizes[size]} border-2 border-accent-700 border-t-accent-400 rounded-full animate-spin`} />
      {text && <p className="text-sm text-slate-400">{text}</p>}
    </div>
  )
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-xl overflow-hidden bg-bg-card animate-pulse ${className}`}>
      <div className="aspect-video bg-bg-hover" />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-bg-hover rounded w-3/4" />
        <div className="h-2 bg-bg-hover rounded w-1/2" />
      </div>
    </div>
  )
}
