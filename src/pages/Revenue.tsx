import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useI18n } from '../contexts/I18nContext'
import { formatDate, formatCurrency } from '../lib/utils'
import type { Payment } from '../types'

export default function Revenue() {
  const { t } = useI18n()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadRevenue() }, [])

  async function loadRevenue() {
    try {
      const { data } = await supabase
        .from('payments')
        .select('*, members:member_id(full_name)')
        .order('paid_at', { ascending: false })
        .limit(50)
      setPayments(data || [])
    } finally { setLoading(false) }
  }

  const totalRevenue = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0)
  const today = new Date().toISOString().split('T')[0]
  const thisMonth = new Date().toISOString().slice(0, 7)
  const todayRevenue = payments.filter(p => p.paid_at?.startsWith(today)).reduce((s, p) => s + (Number(p.amount) || 0), 0)
  const monthRevenue = payments.filter(p => p.paid_at?.startsWith(thisMonth)).reduce((s, p) => s + (Number(p.amount) || 0), 0)

  const stats = [
    { label: t('revenue.today'), value: formatCurrency(todayRevenue), icon: 'bi-currency-dollar', color: '#4F7CFF' },
    { label: t('revenue.month'), value: formatCurrency(monthRevenue), icon: 'bi-calendar-check', color: '#22C55E' },
    { label: t('revenue.total'), value: formatCurrency(totalRevenue), icon: 'bi-graph-up-arrow', color: '#7C6FF0' },
  ]

  if (loading) return (
    <div className="p-8 space-y-6">
      <div className="skeleton h-8 w-48" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}
      </div>
      <div className="skeleton h-64 rounded-2xl" />
    </div>
  )

  return (
    <div className="p-8 space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>{t('revenue.title')}</h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('revenue.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="card-hover rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-base mb-3" style={{ background: `linear-gradient(135deg, ${stat.color}, ${stat.color}88)` }}>
              <i className={`bi ${stat.icon}`} />
            </div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
            <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>{t('revenue.recentTransactions')}</h3>
        {payments.length === 0 ? (
          <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
            <i className="bi bi-receipt text-4xl block mb-3" />
            {t('common.noData')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                  <th className="text-left py-3 px-2 font-medium" style={{ color: 'var(--text-muted)' }}>{t('member.date')}</th>
                  <th className="text-left py-3 px-2 font-medium" style={{ color: 'var(--text-muted)' }}>{t('members.title')}</th>
                  <th className="text-left py-3 px-2 font-medium" style={{ color: 'var(--text-muted)' }}>{t('member.type')}</th>
                  <th className="text-right py-3 px-2 font-medium" style={{ color: 'var(--text-muted)' }}>{t('member.amount')}</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id} className="border-b" style={{ borderColor: 'var(--border)' }}>
                    <td className="py-3 px-2" style={{ color: 'var(--text-primary)' }}>{formatDate(p.paid_at)}</td>
                    <td className="py-3 px-2 font-medium" style={{ color: 'var(--text-primary)' }}>{(p.members as { full_name: string } | undefined)?.full_name || '-'}</td>
                    <td className="py-3 px-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: 'var(--bg-info)', color: 'var(--info)' }}>
                        {p.payment_type}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right font-semibold" style={{ color: 'var(--success)' }}>+{formatCurrency(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
