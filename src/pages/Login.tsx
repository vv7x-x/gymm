import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@heroui/react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useI18n } from '../contexts/I18nContext'

const MAX_ATTEMPTS = 5
const LOCKOUT_MINUTES = 15

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { t, lang, setLang } = useI18n()
  const navigate = useNavigate()

  function getAttempts(): { count: number; lockedUntil: number } {
    try {
      return JSON.parse(localStorage.getItem('login_attempts') || '{"count":0,"lockedUntil":0}')
    } catch {
      return { count: 0, lockedUntil: 0 }
    }
  }

  function recordAttempt() {
    const att = getAttempts()
    att.count += 1
    if (att.count >= MAX_ATTEMPTS) {
      att.lockedUntil = Date.now() + LOCKOUT_MINUTES * 60 * 1000
    }
    localStorage.setItem('login_attempts', JSON.stringify(att))
  }

  function resetAttempts() {
    localStorage.removeItem('login_attempts')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const att = getAttempts()
    if (att.lockedUntil > Date.now()) {
      const mins = Math.ceil((att.lockedUntil - Date.now()) / 60000)
      setError(`Too many attempts. Try again in ${mins} minute(s).`)
      return
    }
    if (att.count >= MAX_ATTEMPTS) {
      resetAttempts()
    }

    if (!email || !password) { setError(t('login.error')); return }
    setLoading(true)
    try {
      await signIn(email, password)
      resetAttempts()
      navigate('/dashboard')
    } catch {
      recordAttempt()
      setError(t('login.error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden" style={{ background: 'var(--bg-body)' }}>
      {/* Decorative grid */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'radial-gradient(circle, var(--primary) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />
      {/* Decorative gradient blobs */}
      <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-10 blur-3xl" style={{ background: 'var(--gradient-1)' }} />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full opacity-10 blur-3xl" style={{ background: 'var(--gradient-2)' }} />

      <div className="absolute top-6 right-6 flex gap-2 z-10">
        <Button variant="ghost" isIconOnly onPress={toggleTheme} aria-label="Toggle theme">
          <i className={`bi ${theme === 'dark' ? 'bi-sun' : 'bi-moon'} text-xl`} />
        </Button>
        <Button variant="ghost" isIconOnly onPress={() => setLang(lang === 'ar' ? 'en' : 'ar')}>
          <i className="bi bi-translate text-xl" />
        </Button>
      </div>

      <div className="w-full max-w-sm relative z-10 animate-fade-up">
        <div className="text-center mb-10">
          <div className="w-20 h-20 mx-auto mb-5 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: 'var(--gradient-1)' }}>
            <span className="text-white font-bold text-2xl">G</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>{t('login.title')}</h1>
          <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>{t('login.subtitle')}</p>
        </div>

        <div className="rounded-2xl border p-8 space-y-6 backdrop-blur-xl" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          {error && (
            <div className="flex items-center gap-2.5 p-3.5 rounded-xl text-sm text-white" style={{ background: 'var(--danger)' }}>
              <i className="bi bi-exclamation-circle-fill" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>{t('login.email')}</label>
              <div className="relative">
                <i className="bi bi-envelope absolute left-3.5 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-muted)' }} />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  required placeholder="admin@gymos.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                  disabled={loading} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>{t('login.password')}</label>
              <div className="relative">
                <i className="bi bi-lock absolute left-3.5 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-muted)' }} />
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  required placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 rounded-xl border text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  style={{ background: 'var(--bg-input)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                  disabled={loading} />
              </div>
            </div>

            <Button type="submit" variant="primary" size="lg" fullWidth isPending={loading} className="font-semibold shadow-lg shadow-primary/20">
              {loading ? t('common.loading') : t('login.signIn')}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
