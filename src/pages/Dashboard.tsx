import { useEffect, useState, useMemo } from 'react'
import { Button } from '@heroui/react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler, ArcElement } from 'chart.js'
import { Line, Doughnut } from 'react-chartjs-2'
import { supabase } from '../lib/supabase'
import { useI18n } from '../contexts/I18nContext'
import { formatDate, formatCurrency } from '../lib/utils'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler, ArcElement)

interface StatCardData {
  label: string
  value: number | string
  icon: string
  gradient: string
  change: string | null
  changePositive?: boolean
}

interface QuickAction {
  icon: string
  title: string
  description: string
  link: string
  gradient: string
}

interface RecentMember {
  id: string
  full_name: string
  phone: string | null
  plan_name: string | null
  status: string
  end_date: string | null
  created_at: string
}

interface UpcomingExp {
  id: string
  full_name: string
  end_date: string
  days_left: number
  member_id: string
}

interface Activity {
  id: string
  type: 'member_added' | 'payment_received' | 'subscription_renewed' | 'expense_added' | 'member_checked_in'
  description: string
  time: string
  icon: string
  color: string
}

const gradients = [
  'linear-gradient(135deg, #4F7CFF, #7C5CFC)',
  'linear-gradient(135deg, #22C55E, #34D965)',
  'linear-gradient(135deg, #F59E0B, #F97316)',
  'linear-gradient(135deg, #EF4444, #F97316)',
  'linear-gradient(135deg, #4F7CFF, #06B6D4)',
  'linear-gradient(135deg, #7C5CFC, #EC4899)',
  'linear-gradient(135deg, #22C55E, #4F7CFF)',
  'linear-gradient(135deg, #F59E0B, #EF4444)',
]

const quickActions: QuickAction[] = [
  { icon: 'bi-person-plus', title: 'Add Member', description: 'Register a new member', link: '/members/add', gradient: 'linear-gradient(135deg, #4F7CFF, #7C5CFC)' },
  { icon: 'bi-qr-code-scan', title: 'Scan QR', description: 'Quick check-in', link: '/scan', gradient: 'linear-gradient(135deg, #22C55E, #34D965)' },
  { icon: 'bi-arrow-clockwise', title: 'Renew Subscription', description: 'Extend membership', link: '/members', gradient: 'linear-gradient(135deg, #F59E0B, #F97316)' },
  { icon: 'bi-wallet2', title: 'Add Expense', description: 'Record an expense', link: '/expenses', gradient: 'linear-gradient(135deg, #EF4444, #F97316)' },
  { icon: 'bi-file-earmark-bar-graph', title: 'View Reports', description: 'Analytics & exports', link: '/reports', gradient: 'linear-gradient(135deg, #7C5CFC, #EC4899)' },
]

const monthLabels = ['5 months ago', '4 months ago', '3 months ago', '2 months ago', 'Last month', 'This month']

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const easeOut = [0.25, 0.1, 0.25, 1] as [number, number, number, number]

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: easeOut } },
}

function CountUp({ value, duration = 1.5 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    let start = 0
    const increment = Math.ceil(value / 60)
    const timer = setInterval(() => {
      start += increment
      if (start >= value) { setCount(value); clearInterval(timer) }
      else setCount(start)
    }, (duration * 1000) / 60)
    return () => clearInterval(timer)
  }, [value, duration])
  return <>{count.toLocaleString()}</>
}

export default function Dashboard() {
  const { t, lang } = useI18n()
  const [stats, setStats] = useState({
    totalMembers: 0, activeSubs: 0, expiringSoon: 0, expired: 0,
    todayRevenue: 0, monthRevenue: 0, totalRevenue: 0,
  })
  const [monthlyRevenue, setMonthlyRevenue] = useState<number[]>([])
  const [planDist, setPlanDist] = useState<{ labels: string[]; data: number[] }>({ labels: [], data: [] })
  const [recentMembers, setRecentMembers] = useState<RecentMember[]>([])
  const [upcomingExps, setUpcomingExps] = useState<UpcomingExp[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  const [greeting] = useState(() => {
    const h = new Date().getHours()
    return h < 12 ? 'Good Morning' : h < 18 ? 'Good Afternoon' : 'Good Evening'
  })

  const today = useMemo(() => {
    const d = new Date()
    return d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })
  }, [lang])

  useEffect(() => { loadStats() }, [])

  async function loadStats() {
    try {
      const [
        { data: members },
        subsRes,
        { data: payments },
        { data: recentM },
        { data: expiring },
        { data: expenses },
      ] = await Promise.all([
        supabase.from('members').select('id'),
        supabase.from('subscriptions').select('status, plan_id, end_date, plans!inner(name), member_id!inner(full_name, id)'),
        supabase.from('payments').select('amount, paid_at, payment_type, members!inner(full_name)'),
        supabase.from('members').select('id, full_name, phone, created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('subscriptions').select('id, end_date, member_id, members!inner(id, full_name, member_id)').in('status', ['active', 'expiring_soon']).limit(10),
        supabase.from('expenses').select('amount, description, expense_date').order('expense_date', { ascending: false }).limit(5),
      ])

      const subs = subsRes.data || []

      const todayStr = new Date().toISOString().split('T')[0]
      const thisMonth = new Date().toISOString().slice(0, 7)

      setStats({
        totalMembers: members?.length || 0,
        activeSubs: subs.filter(s => s.status === 'active' || s.status === 'expiring_soon').length,
        expiringSoon: subs.filter(s => s.status === 'expiring_soon').length,
        expired: subs.filter(s => s.status === 'expired').length,
        todayRevenue: payments?.filter(p => p.paid_at?.startsWith(todayStr)).reduce((s, p) => s + (Number(p.amount) || 0), 0) || 0,
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

      setRecentMembers((recentM || []).map(m => {
        const memberSub = subs.find(s => (s.member_id as unknown as { id: string }).id === m.id) as Record<string, unknown> | undefined
        const plan = memberSub?.plans as { name: string } | undefined
        return {
          id: m.id,
          full_name: m.full_name,
          phone: m.phone,
          plan_name: plan?.name || null,
          status: (memberSub?.status as string) || 'inactive',
          end_date: (memberSub?.end_date as string) || null,
          created_at: m.created_at,
        }
      }))

      const now = new Date()
      const expList: UpcomingExp[] = []
      expiring?.forEach((s: Record<string, unknown>) => {
        if (!s.end_date) return
        const end = new Date(s.end_date as string)
        const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        if (diff >= -1 && diff <= 30) {
          const m = s.members as { id: string; full_name: string; member_id: string }
          expList.push({
            id: s.id as string,
            full_name: m?.full_name || 'Unknown',
            end_date: s.end_date as string,
            days_left: Math.max(0, diff),
            member_id: m?.id || '',
          })
        }
      })
      expList.sort((a, b) => a.days_left - b.days_left)
      setUpcomingExps(expList.slice(0, 6))

      const actList: Activity[] = []

      ;(recentM || []).slice(0, 3).forEach(m => {
        actList.push({
          id: `member-${m.id}`,
          type: 'member_added',
          description: `${m.full_name} joined`,
          time: m.created_at,
          icon: 'bi-person-plus',
          color: '#4F7CFF',
        })
      })

      ;(payments || []).slice(0, 3).forEach(p => {
        actList.push({
          id: `payment-${p.paid_at}-${Math.random()}`,
          type: 'payment_received',
          description: `Payment of ${formatCurrency(Number(p.amount) || 0)} received`,
          time: p.paid_at,
          icon: 'bi-currency-dollar',
          color: '#22C55E',
        })
      })

      ;(expenses || []).slice(0, 3).forEach(e => {
        actList.push({
          id: `expense-${e.expense_date}-${Math.random()}`,
          type: 'expense_added',
          description: `${e.description || 'Expense'} — ${formatCurrency(Number(e.amount) || 0)}`,
          time: e.expense_date,
          icon: 'bi-wallet2',
          color: '#EF4444',
        })
      })

      actList.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      setActivities(actList.slice(0, 8))
    } catch (e) { console.error('[Dashboard] loadStats error:', e) } finally { setLoading(false) }
  }

  const activeRate = stats.totalMembers > 0 ? ((stats.activeSubs / stats.totalMembers) * 100).toFixed(1) : '0'

  const statCards: StatCardData[] = [
    { label: t('dashboard.totalMembers'), value: stats.totalMembers, icon: 'bi-people', gradient: gradients[0], change: '+12%', changePositive: true },
    { label: t('dashboard.activeSubs'), value: stats.activeSubs, icon: 'bi-check-circle', gradient: gradients[1], change: '+5%', changePositive: true },
    { label: t('dashboard.expiringSoon'), value: stats.expiringSoon, icon: 'bi-exclamation-triangle', gradient: gradients[2], change: null },
    { label: t('dashboard.expired'), value: stats.expired, icon: 'bi-x-circle', gradient: gradients[3], change: null },
    { label: t('dashboard.todayRevenue'), value: `EGP ${stats.todayRevenue.toFixed(0)}`, icon: 'bi-currency-dollar', gradient: gradients[4], change: null },
    { label: t('dashboard.thisMonth'), value: `EGP ${stats.monthRevenue.toFixed(0)}`, icon: 'bi-calendar', gradient: gradients[5], change: null },
    { label: t('dashboard.totalRevenue'), value: `EGP ${stats.totalRevenue.toFixed(0)}`, icon: 'bi-graph-up', gradient: gradients[6], change: null },
    { label: t('dashboard.activeRate'), value: `${activeRate}%`, icon: 'bi-pie-chart', gradient: gradients[7], change: null },
  ]

  const hasRevenue = monthlyRevenue.some(v => v > 0)
  const hasPlans = planDist.data.length > 0
  const chartTextColor = '#94A3B8'

  function getStatusColor(status: string) {
    switch (status) {
      case 'active': return { bg: 'var(--bg-success)', color: 'var(--success)' }
      case 'expiring_soon': return { bg: 'var(--bg-warning)', color: 'var(--warning)' }
      case 'expired': return { bg: 'var(--bg-danger)', color: 'var(--danger)' }
      default: return { bg: 'var(--bg-info)', color: 'var(--info)' }
    }
  }

  const daysSinceUpdate = useMemo(() => {
    const now = new Date()
    return `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`
  }, [])

  if (loading) {
    return (
      <div className="p-8 space-y-8">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="skeleton h-10 w-56 rounded-lg" />
            <div className="skeleton h-4 w-72 rounded-lg" />
          </div>
          <div className="skeleton h-11 w-36 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton h-32 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 skeleton h-80 rounded-2xl" />
          <div className="skeleton h-80 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <motion.div
      className="p-8 space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ── Header ── */}
      <motion.div variants={itemVariants} className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-[42px] font-bold tracking-tight leading-none" style={{ color: 'var(--text-primary)' }}>
              {greeting} 👋
            </h1>
          </div>
          <p className="text-base mt-2" style={{ color: 'var(--text-secondary)' }}>
            {today} &mdash; {t('dashboard.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link to="/members/add">
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              <Button
                className="h-11 px-5 rounded-xl font-medium text-white shadow-lg border-none"
                style={{ background: 'linear-gradient(135deg, #4F7CFF, #7C5CFC)', boxShadow: '0 4px 24px rgba(79, 124, 255, 0.35)' }}
              >
                <i className="bi bi-person-plus text-base" />
                {t('dashboard.addMember')}
              </Button>
            </motion.div>
          </Link>
        </div>
      </motion.div>

      {/* ── KPI Cards ── */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <motion.div
            key={i}
            className="relative group rounded-2xl p-6 overflow-hidden transition-all duration-300"
            style={{ background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', WebkitBackdropFilter: 'var(--glass-blur)', border: '1px solid var(--glass-border)' }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            onMouseEnter={e => {
              const el = e.currentTarget
              el.style.borderColor = 'var(--glass-border-hover)'
              el.style.boxShadow = '0 8px 32px rgba(79, 124, 255, 0.15)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget
              el.style.borderColor = 'var(--glass-border)'
              el.style.boxShadow = 'none'
            }}
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
              style={{ background: 'radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(79,124,255,0.06), transparent 40%)' }}
            />
            <div className="flex items-start justify-between mb-4 relative z-10">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-lg shadow-lg"
                style={{ background: stat.gradient, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}
              >
                <i className={`bi ${stat.icon}`} />
              </div>
              {stat.change && (
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                  style={{ background: stat.changePositive ? 'var(--bg-success)' : 'var(--bg-danger)', color: stat.changePositive ? 'var(--success)' : 'var(--danger)' }}
                >
                  <i className={`bi ${stat.changePositive ? 'bi-arrow-up' : 'bi-arrow-down'} text-[10px]`} />
                  {stat.change}
                </span>
              )}
            </div>
            <p className="text-sm font-medium relative z-10" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
            <p className="text-[40px] font-bold mt-1 tracking-tight leading-none relative z-10" style={{ color: 'var(--text-primary)' }}>
              {typeof stat.value === 'number' ? <CountUp value={stat.value} /> : stat.value}
            </p>
            <p className="text-xs mt-2 relative z-10" style={{ color: 'var(--text-muted)' }}>
              Updated {daysSinceUpdate}
            </p>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Quick Actions ── */}
      <motion.div variants={itemVariants}>
        <h2 className="text-2xl font-bold tracking-tight mb-5" style={{ color: 'var(--text-primary)' }}>
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {quickActions.map((action, i) => (
            <Link key={i} to={action.link}>
              <motion.div
                className="relative rounded-2xl p-5 cursor-pointer overflow-hidden group"
                style={{ background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', WebkitBackdropFilter: 'var(--glass-blur)', border: '1px solid var(--glass-border)' }}
                whileHover={{ y: -4, scale: 1.02, transition: { duration: 0.2 } }}
                whileTap={{ scale: 0.98 }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl mb-3 shadow-lg transition-transform duration-300 group-hover:scale-110"
                  style={{ background: action.gradient }}
                >
                  <i className={`bi ${action.icon}`} />
                </div>
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{action.title}</h3>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{action.description}</p>
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl"
                  style={{ boxShadow: 'inset 0 0 0 1px rgba(79,124,255,0.2)' }}
                />
              </motion.div>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* ── Charts Row ── */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div
          className="lg:col-span-2 rounded-2xl p-6 overflow-hidden"
          style={{ background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', WebkitBackdropFilter: 'var(--glass-blur)', border: '1px solid var(--glass-border)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{t('dashboard.monthlyRevenue')}</h3>
          </div>
          {hasRevenue ? (
            <div className="h-72">
              <Line
                data={{
                  labels: monthLabels,
                  datasets: [{
                    label: 'Revenue',
                    data: monthlyRevenue,
                    fill: true,
                    borderColor: '#4F7CFF',
                    backgroundColor: (ctx) => {
                      if (!ctx.chart.chartArea) return 'rgba(79, 124, 255, 0.08)'
                      const g = ctx.chart.ctx.createLinearGradient(0, ctx.chart.chartArea.top, 0, ctx.chart.chartArea.bottom)
                      g.addColorStop(0, 'rgba(79, 124, 255, 0.25)')
                      g.addColorStop(1, 'rgba(79, 124, 255, 0.01)')
                      return g
                    },
                    borderWidth: 2.5,
                    tension: 0.4,
                    pointBackgroundColor: '#4F7CFF',
                    pointBorderColor: 'var(--bg-body)',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: '#4F7CFF',
                    pointHoverBorderColor: '#fff',
                    pointHoverBorderWidth: 2,
                  }],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  animation: { duration: 1200, easing: 'easeOutQuart' },
                  interaction: { intersect: false, mode: 'index' },
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      backgroundColor: 'var(--bg-card)',
                      titleColor: 'var(--text-primary)',
                      bodyColor: 'var(--text-secondary)',
                      borderColor: 'var(--border)',
                      borderWidth: 1,
                      cornerRadius: 12,
                      padding: 12,
                      displayColors: false,
                      callbacks: {
                        label: (ctx) => `EGP ${Number(ctx.parsed.y).toFixed(0)}`,
                      },
                    },
                  },
                  scales: {
                    x: { grid: { display: false }, ticks: { color: chartTextColor, font: { size: 11 } } },
                    y: {
                      grid: { color: 'rgba(255,255,255,0.04)' },
                      ticks: { color: chartTextColor, font: { size: 11 }, callback: (v) => `EGP ${v}` },
                    },
                  },
                }}
              />
            </div>
          ) : (
            <div className="h-72 flex flex-col items-center justify-center rounded-xl" style={{ background: 'var(--bg)' }}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--bg-info)' }}>
                <i className="bi bi-graph-up text-2xl" style={{ color: 'var(--info)' }} />
              </div>
              <h4 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No revenue yet</h4>
              <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Start adding members to see analytics.</p>
              <Link to="/members/add">
                <Button variant="primary" size="sm" className="font-medium">{t('dashboard.addMember')}</Button>
              </Link>
            </div>
          )}
        </div>

        {/* Membership Distribution */}
        <div
          className="rounded-2xl p-6"
          style={{ background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', WebkitBackdropFilter: 'var(--glass-blur)', border: '1px solid var(--glass-border)' }}
        >
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>{t('dashboard.membershipDist')}</h3>
          {hasPlans ? (
            <div className="h-72 flex flex-col items-center justify-center">
              <div className="w-full max-w-[220px] mx-auto">
                <Doughnut
                  data={{
                    labels: planDist.labels,
                    datasets: [{
                      data: planDist.data,
                      backgroundColor: ['#4F7CFF', '#22C55E', '#F59E0B', '#EF4444', '#7C5CFC', '#EC4899', '#06B6D4', '#34D965'],
                      borderWidth: 0,
                      hoverOffset: 10,
                    }],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '72%',
                    animation: { duration: 1000, easing: 'easeOutQuart' },
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: { color: chartTextColor, padding: 12, usePointStyle: true, pointStyle: 'circle', font: { size: 11 } },
                      },
                      tooltip: {
                        backgroundColor: 'var(--bg-card)',
                        titleColor: 'var(--text-primary)',
                        bodyColor: 'var(--text-secondary)',
                        borderColor: 'var(--border)',
                        borderWidth: 1,
                        cornerRadius: 12,
                        padding: 12,
                        callbacks: {
                          label: (ctx) => `${ctx.label}: ${ctx.parsed} members`,
                        },
                      },
                    },
                  }}
                />
              </div>
              <div className="text-center mt-2">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {planDist.data.reduce((a, b) => a + b, 0)} total members
                </span>
              </div>
            </div>
          ) : (
            <div className="h-72 flex flex-col items-center justify-center rounded-xl" style={{ background: 'var(--bg)' }}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--bg-warning)' }}>
                <i className="bi bi-pie-chart text-2xl" style={{ color: 'var(--warning)' }} />
              </div>
              <h4 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No distribution data</h4>
              <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Assign plans to members to see distribution.</p>
              <Link to="/members">
                <Button variant="primary" size="sm" className="font-medium">{t('dashboard.viewMembers')}</Button>
              </Link>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Bottom Row ── */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div
          className="rounded-2xl p-6"
          style={{ background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', WebkitBackdropFilter: 'var(--glass-blur)', border: '1px solid var(--glass-border)' }}
        >
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Recent Activity</h3>
          {activities.length > 0 ? (
            <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1">
              {activities.map((act, i) => (
                <motion.div
                  key={act.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="flex items-start gap-3 py-3 border-b last:border-b-0"
                  style={{ borderColor: 'var(--border-light)' }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-sm shrink-0 mt-0.5"
                    style={{ background: `${act.color}1a`, color: act.color }}
                  >
                    <i className={`bi ${act.icon}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {act.description}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {formatDate(act.time)}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center rounded-xl" style={{ background: 'var(--bg)' }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: 'var(--bg-info)' }}>
                <i className="bi bi-activity text-xl" style={{ color: 'var(--info)' }} />
              </div>
              <h4 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No recent activity</h4>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Activity will appear here as you use the app.</p>
            </div>
          )}
        </div>

        {/* Recent Members */}
        <div
          className="rounded-2xl p-6"
          style={{ background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', WebkitBackdropFilter: 'var(--glass-blur)', border: '1px solid var(--glass-border)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Recent Members</h3>
            <Link to="/members" className="text-xs font-medium" style={{ color: 'var(--primary)' }}>
              View all
            </Link>
          </div>
          {recentMembers.length > 0 ? (
            <div className="space-y-2">
              {recentMembers.map((m, i) => {
                const sc = getStatusColor(m.status)
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-3 p-3 rounded-xl transition-all"
                    style={{ background: 'var(--bg-hover)' }}
                    whileHover={{ x: 4, transition: { duration: 0.15 } }}
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
                      style={{ background: gradients[i % gradients.length] }}
                    >
                      {m.full_name?.[0] || '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{m.full_name}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{m.phone || m.plan_name || 'No plan'}</p>
                    </div>
                    <span className="badge text-[10px]" style={{ background: sc.bg, color: sc.color }}>
                      {m.status === 'active' ? 'Active' : m.status === 'expiring_soon' ? 'Expiring' : m.status === 'expired' ? 'Expired' : 'Inactive'}
                    </span>
                  </motion.div>
                )
              })}
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center rounded-xl" style={{ background: 'var(--bg)' }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: 'var(--bg-info)' }}>
                <i className="bi bi-people text-xl" style={{ color: 'var(--info)' }} />
              </div>
              <h4 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No members yet</h4>
              <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Add your first member to get started.</p>
              <Link to="/members/add">
                <Button variant="primary" size="sm" className="font-medium">{t('dashboard.addMember')}</Button>
              </Link>
            </div>
          )}
        </div>

        {/* Upcoming Expirations */}
        <div
          className="rounded-2xl p-6"
          style={{ background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', WebkitBackdropFilter: 'var(--glass-blur)', border: '1px solid var(--glass-border)' }}
        >
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Upcoming Expirations</h3>
          {upcomingExps.length > 0 ? (
            <div className="space-y-2">
              <div className="flex gap-2 mb-4">
                {[0, 3, 7].map(d => {
                  const count = upcomingExps.filter(e => e.days_left <= (d === 0 ? 0 : d) && (d === 0 ? true : e.days_left > (d === 3 ? 0 : 3))).length
                  if (d === 0 && count === 0) return null
                  return (
                    <div
                      key={d}
                      className="flex-1 rounded-xl p-3 text-center"
                      style={{ background: d === 0 ? 'var(--bg-danger)' : d <= 3 ? 'var(--bg-warning)' : 'var(--bg-info)' }}
                    >
                      <p className="text-xl font-bold" style={{ color: d === 0 ? 'var(--danger)' : d <= 3 ? 'var(--warning)' : 'var(--info)' }}>
                        {count}
                      </p>
                      <p className="text-[10px] font-medium mt-0.5" style={{ color: d === 0 ? 'var(--danger)' : d <= 3 ? 'var(--warning)' : 'var(--info)' }}>
                        {d === 0 ? 'Today' : d <= 3 ? `${d} Days` : `${d} Days`}
                      </p>
                    </div>
                  )
                })}
              </div>
              <div className="space-y-2 max-h-[260px] overflow-y-auto">
                {upcomingExps.slice(0, 5).map((exp, i) => {
                  const urgent = exp.days_left <= 1
                  const warning = exp.days_left <= 3
                  return (
                    <motion.div
                      key={exp.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3 p-3 rounded-xl transition-all"
                      style={{ background: 'var(--bg-hover)' }}
                      whileHover={{ x: 4, transition: { duration: 0.15 } }}
                    >
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
                        style={{ background: urgent ? gradients[3] : warning ? gradients[2] : gradients[1] }}
                      >
                        {exp.full_name?.[0] || '?'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{exp.full_name}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {formatDate(exp.end_date)}
                        </p>
                      </div>
                      <span
                        className="badge text-[10px] shrink-0"
                        style={{ background: urgent ? 'var(--bg-danger)' : warning ? 'var(--bg-warning)' : 'var(--bg-success)', color: urgent ? 'var(--danger)' : warning ? 'var(--warning)' : 'var(--success)' }}
                      >
                        {exp.days_left === 0 ? 'Today' : `${exp.days_left}d`}
                      </span>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center rounded-xl" style={{ background: 'var(--bg)' }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3" style={{ background: 'var(--bg-success)' }}>
                <i className="bi bi-calendar-check text-xl" style={{ color: 'var(--success)' }} />
              </div>
              <h4 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No upcoming expirations</h4>
              <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                All memberships are up to date.
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
