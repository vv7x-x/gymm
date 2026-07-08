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

      <div className="glass rounded-2xl p-5">
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
        <div className="glass rounded-2xl p-6 animate-scale-in">
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>{t('expenses.add')}</h3>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>{t('expenses.category')}</label>
                <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} required
                  className="form-input">
                  <option value="">{t('common.select')}</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>{t('expenses.amount')}</label>
                <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: +e.target.value }))} required min={0} step="0.01"
                  className="form-input" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>{t('expenses.date')}</label>
                <input type="date" value={form.expense_date} onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))} required
                  className="form-input" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>{t('expenses.method')}</label>
                <select value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
                  className="form-input">
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="bank">{t('expenses.bankTransfer')}</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>{t('expenses.description')}</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} maxLength={500}
                  className="form-input resize-none" />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" variant="primary">{t('common.save')}</Button>
              <Button variant="ghost" onPress={() => setShowForm(false)}>{t('common.cancel')}</Button>
            </div>
          </form>
        </div>
      )}

      <div className="glass rounded-2xl overflow-hidden">
        <div className="p-6 pb-0">
          <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{t('expenses.history')}</h3>
        </div>
        {expenses.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><i className="bi bi-receipt-cutoff" /></div>
            {t('common.noData')}
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table-base">
              <thead>
                <tr>
                  <th>{t('expenses.date')}</th>
                  <th>{t('expenses.category')}</th>
                  <th>{t('expenses.description')}</th>
                  <th style={{ textAlign: 'right' }}>{t('expenses.amount')}</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(ex => (
                  <tr key={ex.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(ex.expense_date)}</td>
                    <td>
                      <span className="inline-flex items-center gap-1.5">
                        {ex.expense_categories?.color && <span className="w-2 h-2 rounded-full" style={{ background: ex.expense_categories.color }} />}
                        <span style={{ color: 'var(--text-primary)' }}>{ex.expense_categories?.name || '-'}</span>
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{ex.description || '-'}</td>
                    <td style={{ textAlign: 'right' }}><span style={{ color: 'var(--danger)' }}>-{formatCurrency(ex.amount)}</span></td>
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
