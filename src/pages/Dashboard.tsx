import { useEffect, useState } from 'react'
import { Button } from '@heroui/react'
import { Link } from 'react-router-dom'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler, ArcElement } from 'chart.js'
import { Line, Doughnut } from 'react-chartjs-2'
import { supabase } from '../lib/supabase'
import { useI18n } from '../contexts/I18nContext'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler, ArcElement)

export default function Dashboard() {
  const { t } = useI18n()
  const [stats, setStats] = useState({
    totalMembers: 0, activeSubs: 0, expiringSoon: 0, expired: 0,
    todayRevenue: 0, monthRevenue: 0, totalRevenue: 0,
  })
  const [monthlyRevenue, setMonthlyRevenue] = useState<number[]>([])
  const [planDist, setPlanDist] = useState<{ labels: string[]; data: number[] }>({ labels: [], data: [] })
  const [loading, setLoading] = useState(true)
  const [greeting] = useState(() => {
    const h = new Date().getHours()
    return h < 12 ? 'Good Morning' : h < 18 ? 'Good Afternoon' : 'Good Evening'
  })

  useEffect(() => { loadStats() }, [])

  async function loadStats() {
    try {
      const [{ data: members }, subsRes, { data: payments }] = await Promise.all([
        supabase.from('members').select('id'),
        supabase.from('subscriptions').select('status, plan_id, plans!inner(name)'),
        supabase.from('payments').select('amount, paid_at'),
      ])
      const subs = subsRes.data || []
      const today = new Date().toISOString().split('T')[0]
      const thisMonth = new Date().toISOString().slice(0, 7)

      setStats({
        totalMembers: members?.length || 0,
        activeSubs: subs.filter(s => s.status === 'active' || s.status === 'expiring_soon').length,
        expiringSoon: subs.filter(s => s.status === 'expiring_soon').length,
        expired: subs.filter(s => s.status === 'expired').length,
        todayRevenue: payments?.filter(p => p.paid_at?.startsWith(today)).reduce((s, p) => s + (Number(p.amount) || 0), 0) || 0,
        monthRevenue: payments?.filter(p => p.paid_at?.startsWith(thisMonth)).reduce((s, p) => s + (Number(p.amount) || 0), 0) || 0,
        totalRevenue: payments?.reduce((s, p) => s + (Number(p.amount) || 0), 0) || 0,
      })

      const monthly: number[] = []
      for (let i = 5; i >= 0; i--) {
        const m = new Date()
        m.setMonth(m.getMonth() - i)
        const prefix = m.toISOString().slice(0, 7)
        monthly.push(payments?.filter(p => p.paid_at?.startsWith(prefix)).reduce((s, p) => s + (Number(p.amount) || 0), 0) || 0)
      }
      setMonthlyRevenue(monthly)

      const planCounts: Record<string, number> = {}
      subs.forEach((s: Record<string, unknown>) => {
        const p = s.plans as { name: string } | undefined
        const name = p?.name || 'Unknown'
        planCounts[name] = (planCounts[name] || 0) + 1
      })
      setPlanDist({ labels: Object.keys(planCounts), data: Object.values(planCounts) })
    } catch { /* silent */ } finally { setLoading(false) }
  }

  const activeRate = stats.totalMembers > 0 ? ((stats.activeSubs / stats.totalMembers) * 100).toFixed(1) : '0'

  const statCards = [
    { label: t('dashboard.totalMembers'), value: stats.totalMembers, icon: 'bi-people', color: '#4F7CFF', change: '+12%' },
    { label: t('dashboard.activeSubs'), value: stats.activeSubs, icon: 'bi-check-circle', color: '#22C55E', change: '+5%' },
    { label: t('dashboard.expiringSoon'), value: stats.expiringSoon, icon: 'bi-exclamation-triangle', color: '#F59E0B', change: '-2%' },
    { label: t('dashboard.expired'), value: stats.expired, icon: 'bi-x-circle', color: '#EF4444', change: null },
    { label: t('dashboard.todayRevenue'), value: `EGP ${stats.todayRevenue.toFixed(0)}`, icon: 'bi-currency-dollar', color: '#4F7CFF', change: null },
    { label: t('dashboard.thisMonth'), value: `EGP ${stats.monthRevenue.toFixed(0)}`, icon: 'bi-calendar', color: '#22C55E', change: null },
    { label: t('dashboard.totalRevenue'), value: `EGP ${stats.totalRevenue.toFixed(0)}`, icon: 'bi-graph-up', color: '#7C6FF0', change: null },
    { label: t('dashboard.activeRate'), value: `${activeRate}%`, icon: 'bi-pie-chart', color: '#F59E0B', change: null },
  ]

  if (loading) {
    return (
      <div className="p-8 space-y-8">
        <div><div className="skeleton h-8 w-48 mb-2" /><div className="skeleton h-4 w-64" /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8 animate-fade-up">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>{greeting} 👋</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)' }}>{t('dashboard.subtitle')}</p>
        </div>
        <Link to="/members/add">
          <Button variant="primary" size="lg" className="shadow-lg shadow-primary/20">
            <i className="bi bi-person-plus text-base" />
            {t('dashboard.addMember')}
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <div key={i} className="card-hover rounded-2xl border p-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="flex items-start justify-between mb-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-lg" style={{ background: `linear-gradient(135deg, ${stat.color}, ${stat.color}88)` }}>
                <i className={`bi ${stat.icon}`} />
              </div>
              {stat.change && (
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${stat.change.startsWith('+') ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}
                  style={{ background: stat.change.startsWith('+') ? 'var(--bg-success)' : 'var(--bg-danger)', color: stat.change.startsWith('+') ? 'var(--success)' : 'var(--danger)' }}>
                  {stat.change}
                </span>
              )}
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
            <p className="text-2xl font-bold mt-0.5" style={{ color: 'var(--text-primary)' }}>
              {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border p-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>{t('dashboard.monthlyRevenue')}</h3>
          {monthlyRevenue.some(v => v > 0) ? (
            <div className="h-72">
              <Line data={{
                labels: ['5 months ago', '4 months ago', '3 months ago', '2 months ago', 'Last month', 'This month'],
                datasets: [{
                  label: 'Revenue',
                  data: monthlyRevenue,
                  fill: true,
                  borderColor: '#4F7CFF',
                  backgroundColor: 'rgba(79, 124, 255, 0.08)',
                  borderWidth: 2,
                  tension: 0.4,
                  pointBackgroundColor: '#4F7CFF',
                  pointBorderColor: '#fff',
                  pointBorderWidth: 2,
                  pointRadius: 4,
                }],
              }} options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  x: { grid: { display: false }, ticks: { color: '#94A3B8' } },
                  y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#94A3B8' } },
                },
              }} />
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center rounded-xl" style={{ background: 'var(--bg)' }}>
              <p style={{ color: 'var(--text-muted)' }}>{t('common.noData')}</p>
            </div>
          )}
        </div>

        <div className="rounded-2xl border p-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>{t('dashboard.membershipDist')}</h3>
          {planDist.data.length > 0 ? (
            <div className="h-72 flex items-center justify-center">
              <Doughnut data={{
                labels: planDist.labels,
                datasets: [{
                  data: planDist.data,
                  backgroundColor: ['#4F7CFF', '#22C55E', '#F59E0B', '#EF4444', '#7C6FF0', '#EC4899'],
                  borderWidth: 0,
                  hoverOffset: 8,
                }],
              }} options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: { color: '#94A3B8', padding: 16, usePointStyle: true, pointStyle: 'circle' },
                  },
                },
                cutout: '65%',
              }} />
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center rounded-xl" style={{ background: 'var(--bg)' }}>
              <p style={{ color: 'var(--text-muted)' }}>{t('common.noData')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
