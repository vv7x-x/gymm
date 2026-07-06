import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@heroui/react'
import { supabase } from '../lib/supabase'
import { useI18n } from '../contexts/I18nContext'
import { sanitize } from '../lib/utils'

interface Member {
  id: string
  first_name: string
  last_name: string
  phone: string
  email: string
  created_at: string
  member_code: string
  subscription?: { status: string; end_date: string }
}

export default function Members() {
  const { t, dir } = useI18n()
  const isRtl = dir === 'rtl'
  const navigate = useNavigate()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => { loadMembers() }, [])

  async function loadMembers() {
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*, subscription:subscriptions(status, end_date)')
        .order('created_at', { ascending: false })
      if (error) throw error
      setMembers(data || [])
    } catch { /* silent */ } finally { setLoading(false) }
  }

  const filtered = members.filter(m => {
    if (!search) return true
    const q = search.toLowerCase()
    return [m.first_name, m.last_name, m.phone, m.member_code].some(f => f?.toLowerCase().includes(q))
  })

  const statusBadge = (status: string) => {
    const map: Record<string, { bg: string; color: string; icon: string }> = {
      active: { bg: 'var(--bg-success)', color: 'var(--success)', icon: 'bi-check-circle-fill' },
      expiring_soon: { bg: 'var(--bg-warning)', color: 'var(--warning)', icon: 'bi-exclamation-circle-fill' },
      expired: { bg: 'var(--bg-danger)', color: 'var(--danger)', icon: 'bi-x-circle-fill' },
      paused: { bg: 'var(--bg-warning)', color: 'var(--warning)', icon: 'bi-pause-circle-fill' },
    }
    const s = map[status] || { bg: 'var(--bg-info)', color: 'var(--text-muted)', icon: 'bi-dash-circle-fill' }
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: s.bg, color: s.color }}>
        <i className={`bi ${s.icon} text-[10px]`} />
        {t(`status.${status}`)}
      </span>
    )
  }

  if (loading) return (
    <div className="p-8 space-y-6">
      <div className="skeleton h-8 w-48" />
      <div className="skeleton h-12 w-full" />
      <div className="space-y-3">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}</div>
    </div>
  )

  return (
    <div className="p-8 space-y-6 animate-fade-up">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>{t('members.title')}</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('members.total')}: {members.length}</p>
        </div>
        <Link to="/members/add">
          <Button variant="primary" className="shadow-lg shadow-primary/20">
            <i className="bi bi-person-plus text-base" />
            {t('members.add')}
          </Button>
        </Link>
      </div>

      <div className="relative">
        <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-muted)' }} />
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)} maxLength={100}
          placeholder={t('members.search')}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30"
          style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}
        />
      </div>

      <div className="grid gap-3">
        {filtered.map((member, i) => (
          <div
            key={member.id}
            className="card-hover rounded-2xl border p-4 flex items-center gap-4 cursor-pointer animate-fade-up"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', animationDelay: `${i * 40}ms` }}
            onClick={() => navigate(`/members/${member.id}`)}
          >
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-semibold text-sm shrink-0" style={{ background: 'var(--gradient-1)' }}>
              {member.first_name?.[0]}{member.last_name?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                  {sanitize(`${member.first_name} ${member.last_name}`)}
                </span>
                {member.subscription && statusBadge(member.subscription.status)}
              </div>
              <div className="flex items-center gap-3 text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                {member.member_code && <span className="font-mono">#{sanitize(member.member_code)}</span>}
                {member.phone && <span><i className="bi bi-telephone" /> {sanitize(member.phone)}</span>}
              </div>
            </div>
            <i className={`bi ${isRtl ? 'bi-chevron-left' : 'bi-chevron-right'} text-lg`} style={{ color: 'var(--text-muted)' }} />
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
            <i className="bi bi-people text-4xl block mb-3" />
            {search ? t('members.noResults') : t('members.empty')}
          </div>
        )}
      </div>
    </div>
  )
}
