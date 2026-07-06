import { useEffect, useState } from 'react'
import { Button } from '@heroui/react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useI18n } from '../contexts/I18nContext'
import { pick } from '../lib/utils'
import { useNavigate } from 'react-router-dom'
import type { Settings as SettingsType } from '../types'

export default function Settings() {
  const { t } = useI18n()
  const { signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { lang, setLang } = useI18n()
  const navigate = useNavigate()
  const [settings, setSettings] = useState<SettingsType | null>(null)
  const [form, setForm] = useState({ gym_name: '', currency: 'EGP', gym_phone: '', gym_address: '', freeze_fee: 0, freeze_max_days: 30, freeze_fee_enabled: false })

  useEffect(() => { loadSettings() }, [])

  async function loadSettings() {
    const { data } = await supabase.from('settings').select('*').limit(1).maybeSingle()
    if (data) {
      setSettings(data)
      setForm({
        gym_name: data.gym_name || '',
        currency: data.currency || 'EGP',
        gym_phone: data.gym_phone || '',
        gym_address: data.gym_address || '',
        freeze_fee: data.freeze_fee || 0,
        freeze_max_days: data.freeze_max_days || 30,
        freeze_fee_enabled: data.freeze_fee_enabled || false,
      })
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    const allowed = pick(form, ['gym_name', 'currency', 'gym_phone', 'gym_address', 'freeze_fee', 'freeze_max_days', 'freeze_fee_enabled'])
    if (settings) {
      await supabase.from('settings').update(allowed).eq('id', settings.id)
    } else {
      await supabase.from('settings').insert(allowed)
    }
    loadSettings()
  }

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="p-8 space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>{t('settings.title')}</h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('settings.subtitle')}</p>
      </div>

      <div className="rounded-2xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>{t('settings.general')}</h3>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>{t('settings.gymName')}</label>
              <input value={form.gym_name} onChange={e => setForm(f => ({ ...f, gym_name: e.target.value }))} maxLength={100}
                className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                style={{ background: 'var(--bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>{t('settings.currency')}</label>
              <input value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} maxLength={10}
                className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                style={{ background: 'var(--bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>{t('settings.phone')}</label>
              <input value={form.gym_phone} onChange={e => setForm(f => ({ ...f, gym_phone: e.target.value }))} maxLength={20}
                className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                style={{ background: 'var(--bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>{t('settings.address')}</label>
              <input value={form.gym_address} onChange={e => setForm(f => ({ ...f, gym_address: e.target.value }))} maxLength={500}
                className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                style={{ background: 'var(--bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }} />
            </div>
          </div>
          <Button type="submit" variant="primary">{t('settings.save')}</Button>
        </form>
      </div>

      <div className="rounded-2xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>{t('settings.appearance')}</h3>
        <div className="flex flex-wrap gap-3">
          <Button variant={theme === 'dark' ? 'primary' : 'ghost'} onPress={() => { if (theme !== 'dark') toggleTheme() }}>
            <i className="bi bi-moon-fill" /> {t('settings.dark')}
          </Button>
          <Button variant={theme === 'light' ? 'primary' : 'ghost'} onPress={() => { if (theme !== 'light') toggleTheme() }}>
            <i className="bi bi-sun-fill" /> {t('settings.light')}
          </Button>
          <Button variant="ghost" onPress={() => setLang(lang === 'ar' ? 'en' : 'ar')}>
            <i className="bi bi-translate" /> {lang === 'ar' ? 'English' : 'العربية'}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>{t('settings.account')}</h3>
        <Button variant="ghost" onPress={handleLogout} style={{ color: 'var(--danger)' }}>
          <i className="bi bi-box-arrow-right" /> {t('settings.signOut')}
        </Button>
      </div>
    </div>
  )
}
