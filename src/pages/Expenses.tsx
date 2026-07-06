import { useEffect, useState } from 'react'
import { Button } from '@heroui/react'
import { supabase } from '../lib/supabase'
import { useI18n } from '../contexts/I18nContext'
import { formatDate, formatCurrency, pick } from '../lib/utils'
import type { Expense, ExpenseCategory } from '../types'

export default function Expenses() {
  const { t } = useI18n()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ category_id: '', amount: 0, description: '', expense_date: new Date().toISOString().split('T')[0], payment_method: 'cash' })

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      const [expRes, catRes] = await Promise.all([
        supabase.from('expenses').select('*, expense_categories:category_id(name, color)').order('expense_date', { ascending: false }).limit(50),
        supabase.from('expense_categories').select('*').eq('is_active', true),
      ])
      setExpenses(expRes.data || [])
      setCategories(catRes.data || [])
    } finally { setLoading(false) }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    await supabase.from('expenses').insert(pick(form, ['category_id', 'amount', 'description', 'expense_date', 'payment_method']))
    setShowForm(false)
    setForm({ category_id: '', amount: 0, description: '', expense_date: new Date().toISOString().split('T')[0], payment_method: 'cash' })
    loadData()
  }

  const totalExpenses = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0)

  if (loading) return (
    <div className="p-8 space-y-6">
      <div className="skeleton h-8 w-48" />
      <div className="skeleton h-20 rounded-2xl" />
      <div className="skeleton h-64 rounded-2xl" />
    </div>
  )

  return (
    <div className="p-8 space-y-6 animate-fade-up">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>{t('expenses.title')}</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('expenses.subtitle')}</p>
        </div>
        <Button variant="primary" onPress={() => setShowForm(true)}><i className="bi bi-plus" /> {t('expenses.add')}</Button>
      </div>

      <div className="rounded-2xl border p-5" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white" style={{ background: 'var(--gradient-4)' }}>
            <i className="bi bi-wallet2" />
          </div>
          <div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('revenue.total')}</p>
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(totalExpenses)}</p>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="rounded-2xl border p-6 animate-scale-in" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>{t('expenses.add')}</h3>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>{t('expenses.category')}</label>
                <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} required
                  className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  style={{ background: 'var(--bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}>
                  <option value="">{t('common.select')}</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>{t('expenses.amount')}</label>
                <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: +e.target.value }))} required min={0} step="0.01"
                  className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  style={{ background: 'var(--bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>{t('expenses.date')}</label>
                <input type="date" value={form.expense_date} onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))} required
                  className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  style={{ background: 'var(--bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>{t('expenses.method')}</label>
                <select value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  style={{ background: 'var(--bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }}>
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="bank">{t('expenses.bankTransfer')}</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>{t('expenses.description')}</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} maxLength={500}
                  className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none"
                  style={{ background: 'var(--bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }} />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" variant="primary">{t('common.save')}</Button>
              <Button variant="ghost" onPress={() => setShowForm(false)}>{t('common.cancel')}</Button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
        <div className="p-6 pb-0">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{t('expenses.history')}</h3>
        </div>
        {expenses.length === 0 ? (
          <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
            <i className="bi bi-receipt-cutoff text-4xl block mb-3" />
            {t('common.noData')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                  <th className="text-left py-3 px-6 font-medium" style={{ color: 'var(--text-muted)' }}>{t('expenses.date')}</th>
                  <th className="text-left py-3 px-6 font-medium" style={{ color: 'var(--text-muted)' }}>{t('expenses.category')}</th>
                  <th className="text-left py-3 px-6 font-medium" style={{ color: 'var(--text-muted)' }}>{t('expenses.description')}</th>
                  <th className="text-right py-3 px-6 font-medium" style={{ color: 'var(--text-muted)' }}>{t('expenses.amount')}</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(ex => (
                  <tr key={ex.id} className="border-b" style={{ borderColor: 'var(--border)' }}>
                    <td className="py-3 px-6" style={{ color: 'var(--text-primary)' }}>{formatDate(ex.expense_date)}</td>
                    <td className="py-3 px-6">
                      <span className="inline-flex items-center gap-1.5">
                        {ex.expense_categories?.color && <span className="w-2 h-2 rounded-full" style={{ background: ex.expense_categories.color }} />}
                        <span style={{ color: 'var(--text-primary)' }}>{ex.expense_categories?.name || '-'}</span>
                      </span>
                    </td>
                    <td className="py-3 px-6" style={{ color: 'var(--text-secondary)' }}>{ex.description || '-'}</td>
                    <td className="py-3 px-6 text-right font-semibold" style={{ color: 'var(--danger)' }}>-{formatCurrency(ex.amount)}</td>
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
