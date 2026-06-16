import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home, Compass, Heart, History, Database, Settings, Tv, ChevronLeft, ChevronRight, Lock
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useStore } from '../../store'
import { useState } from 'react'

interface NavItem {
  to: string
  icon: React.ComponentType<any>
  labelKey: string
  dividerAfter?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', icon: Home, labelKey: 'nav.home' },
  { to: '/browse', icon: Compass, labelKey: 'nav.browse' },
  { to: '/favorites', icon: Heart, labelKey: 'nav.favorites' },
  { to: '/history', icon: History, labelKey: 'nav.history', dividerAfter: true },
  { to: '/sources', icon: Database, labelKey: 'nav.sources' },
  { to: '/settings', icon: Settings, labelKey: 'nav.settings' }
]

export function Sidebar() {
  const { t } = useTranslation()
  const { parentalControl, isParentalUnlocked } = useStore()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <motion.aside
      className="flex flex-col h-full bg-bg-secondary border-r border-white/5 relative flex-shrink-0"
      animate={{ width: collapsed ? 64 : 220 }}
      transition={{ type: 'spring', stiffness: 400, damping: 35 }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/5">
        <div className="w-8 h-8 bg-accent-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-glow-sm">
          <Tv size={16} className="text-white" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              className="text-white font-bold text-base tracking-tight whitespace-nowrap overflow-hidden"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
            >
              IPTV <span className="text-accent-400">PlayerX</span>
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(item => (
          <div key={item.to}>
            <NavLink to={item.to} end={item.to === '/'}>
              {({ isActive }) => (
                <motion.div
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer relative group ${
                    isActive
                      ? 'bg-accent-600/20 text-accent-400'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {isActive && (
                    <motion.div
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-accent-400 rounded-full"
                      layoutId="activeIndicator"
                    />
                  )}
                  <item.icon size={18} className="flex-shrink-0" />
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        className="text-sm font-medium whitespace-nowrap overflow-hidden"
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                      >
                        {t(item.labelKey)}
                      </motion.span>
                    )}
                  </AnimatePresence>

                  {/* Tooltip when collapsed */}
                  {collapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-bg-card border border-white/10 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-card">
                      {t(item.labelKey)}
                    </div>
                  )}
                </motion.div>
              )}
            </NavLink>
            {item.dividerAfter && <div className="my-2 mx-3 border-t border-white/5" />}
          </div>
        ))}
      </nav>

      {/* Parental control status */}
      {parentalControl.enabled && !collapsed && (
        <div className="px-3 py-2 mx-2 mb-2 bg-accent-900/30 border border-accent-700/30 rounded-xl">
          <div className="flex items-center gap-2">
            <Lock size={12} className={isParentalUnlocked ? 'text-green-400' : 'text-accent-400'} />
            <span className="text-xs text-slate-400">
              {isParentalUnlocked ? 'Parental Unlocked' : 'Parental Active'}
            </span>
          </div>
        </div>
      )}

      {/* Collapse button */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="absolute -right-3 top-16 w-6 h-6 bg-bg-card border border-white/10 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-accent-700 hover:border-accent-600 transition-all z-10 shadow-card"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </motion.aside>
  )
}
