import { useState, type ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Button } from '@heroui/react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useI18n } from '../contexts/I18nContext'

const navSections = [
  {
    label: 'Main Menu',
    items: [
      { id: 'dashboard', icon: 'bi-grid-1x2', key: 'nav.dashboard', path: '/dashboard' },
      { id: 'members', icon: 'bi-people', key: 'nav.members', path: '/members' },
      { id: 'plans', icon: 'bi-boxes', key: 'nav.plans', path: '/plans' },
      { id: 'services', icon: 'bi-gear', key: 'nav.services', path: '/services' },
      { id: 'scan', icon: 'bi-qr-code-scan', key: 'nav.scan', path: '/scan' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { id: 'revenue', icon: 'bi-currency-dollar', key: 'nav.revenue', path: '/revenue' },
      { id: 'expenses', icon: 'bi-wallet2', key: 'nav.expenses', path: '/expenses' },
      { id: 'reports', icon: 'bi-file-earmark-bar-graph', key: 'nav.reports', path: '/reports' },
    ],
  },
  {
    label: 'System',
    items: [
      { id: 'branches', icon: 'bi-building', key: 'nav.branches', path: '/branches' },
      { id: 'settings', icon: 'bi-sliders', key: 'nav.settings', path: '/settings' },
    ],
  },
]

export default function Layout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const { signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { t, lang, setLang, dir } = useI18n()
  const navigate = useNavigate()
  const isRtl = dir === 'rtl'

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden" dir={dir}>
      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 z-40 h-full flex flex-col transition-all duration-300 backdrop-blur-xl
          ${isRtl ? 'right-0 border-l' : 'left-0 border-r'}
          ${collapsed ? 'w-[72px]' : 'w-[264px]'}
          ${isRtl
            ? (sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0')
            : (sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0')
          }`}
        style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center h-[68px] border-b px-4 gap-2" style={{ borderColor: 'var(--border)' }}>
          <img src="/logo.svg" alt="GYMOS" className="h-8 w-8 shrink-0" />
          {!collapsed && <span className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>GYMOS</span>}
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-4">
          {navSections.map(section => (
            <div key={section.label}>
              {!collapsed && (
                <div className="text-xs font-semibold uppercase tracking-widest px-3 mb-2" style={{ color: 'var(--text-muted)' }}>
                  {section.label}
                </div>
              )}
              <div className="space-y-0.5">
                {section.items.map(item => (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 hover:opacity-100"
                    style={({ isActive }) => ({
                      color: isActive ? '#fff' : 'var(--text-secondary)',
                      background: isActive ? 'var(--primary)' : 'transparent',
                      opacity: isActive ? 1 : 0.7,
                    })}
                  >
                    <i className={`bi ${item.icon} text-lg shrink-0`} />
                    {!collapsed && <span>{t(item.key)}</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t p-3 space-y-3" style={{ borderColor: 'var(--border)' }}>
          {!collapsed && (
            <div className="flex items-center gap-3 px-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0" style={{ background: 'var(--primary)' }}>
                A
              </div>
              <div className="text-sm">
                <div className="font-medium" style={{ color: 'var(--text-primary)' }}>Admin</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Owner</div>
              </div>
            </div>
          )}
          <div className="flex justify-center gap-1">
            <Button variant="ghost" isIconOnly onPress={() => setLang(lang === 'ar' ? 'en' : 'ar')} aria-label={t('nav.lang')}>
              <i className="bi bi-translate text-lg" />
            </Button>
            <Button variant="ghost" isIconOnly onPress={toggleTheme} aria-label="Toggle theme">
              <i className={`bi ${theme === 'dark' ? 'bi-sun' : 'bi-moon'} text-lg`} />
            </Button>
            <Button variant="ghost" isIconOnly onPress={() => setCollapsed(c => !c)} aria-label="Collapse">
              <i className={`bi ${isRtl ? (collapsed ? 'bi-chevron-left' : 'bi-chevron-right') : (collapsed ? 'bi-chevron-right' : 'bi-chevron-left')} text-lg`} />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${collapsed ? (isRtl ? 'lg:mr-[72px]' : 'lg:ml-[72px]') : (isRtl ? 'lg:mr-[264px]' : 'lg:ml-[264px]')}`}>
        <header className="h-[68px] border-b flex items-center px-6 gap-2 sticky top-0 z-20" style={{ background: 'var(--bg-topbar)', borderColor: 'var(--border)', backdropFilter: 'blur(20px)' }}>
          <Button variant="ghost" isIconOnly className="lg:hidden" onPress={() => setSidebarOpen(true)} aria-label="Menu">
            <i className="bi bi-list text-xl" />
          </Button>
          <div className="flex-1" />
          <Button variant="ghost" isIconOnly onPress={handleLogout} aria-label={t('nav.logout')}>
            <i className={`bi ${isRtl ? 'bi-box-arrow-left' : 'bi-box-arrow-right'} text-lg`} />
          </Button>
        </header>

        <main className="flex-1 overflow-auto" style={{ background: 'var(--bg-body)' }}>
          <div className="page-content">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
