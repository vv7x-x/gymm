import { useEffect, useState } from 'react'
import { Button } from '@heroui/react'
import { supabase } from '../lib/supabase'
import { useI18n } from '../contexts/I18nContext'
import { useToast } from '../contexts/ToastContext'
import { pick } from '../lib/utils'
import ConfirmModal from '../components/ConfirmModal'
import type { Plan } from '../types'

export default function Plans() {
  const { t } = useI18n()
  const { toast } = useToast()
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Plan | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Plan | null>(null)
  const [form, setForm] = useState({ name: '', duration_days: 30, price: 0, description: '', color: '#4F7CFF' })

  useEffect(() => { loadPlans() }, [])

  async function loadPlans() {
    try {
      const { data } = await supabase.from('plans').select('*').order('price')
      setPlans(data || [])
    } finally { setLoading(false) }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const allowed = pick(form, ['name', 'duration_days', 'price', 'description', 'color'])
      if (editing) {
        await supabase.from('plans').update(allowed).eq('id', editing.id)
        toast(t('plans.saved'), 'success')
      } else {
        await supabase.from('plans').insert(allowed)
        toast(t('plans.saved'), 'success')
      }
      setShowForm(false); setEditing(null)
      setForm({ name: '', duration_days: 30, price: 0, description: '', color: '#4F7CFF' })
      loadPlans()
    } catch { toast(t('common.error'), 'error') } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await supabase.from('plans').delete().eq('id', deleteTarget.id)
      toast(t('plans.deleted'), 'success')
      setDeleteTarget(null)
      loadPlans()
    } catch { toast(t('common.error'), 'error') }
  }

  return (
    <div className="p-8 space-y-6 animate-fade-up">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>{t('plans.title')}</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('plans.total')}: {plans.length}</p>
        </div>
        <Button variant="primary" onPress={() => { setEditing(null); setForm({ name: '', duration_days: 30, price: 0, description: '', color: '#4F7CFF' }); setShowForm(true) }}>
          <i className="bi bi-plus" /> {t('plans.add')}
        </Button>
      </div>

      {showForm && (
        <div className="glass rounded-2xl p-6 animate-scale-in">
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>{t('plans.name')}</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required maxLength={100}
                  className="form-input" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>{t('plans.duration')}</label>
                <input type="number" value={form.duration_days} onChange={e => setForm(f => ({ ...f, duration_days: +e.target.value }))} required min={1}
                  className="form-input" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>{t('plans.price')}</label>
                <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: +e.target.value }))} required min={0} step="0.01"
                  className="form-input" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>{t('plans.color')}</label>
                <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                  className="w-full h-10 rounded-xl border cursor-pointer" style={{ background: 'transparent', borderColor: 'var(--border)' }} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>{t('plans.description')}</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} maxLength={500}
                  className="form-input resize-none" />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" variant="primary" isPending={saving}>{t('common.save')}</Button>
              <Button variant="ghost" onPress={() => setShowForm(false)}>{t('common.cancel')}</Button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-36 rounded-2xl" />)}
        </div>
      ) : plans.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><i className="bi bi-boxes" /></div>
          <p className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>{t('plans.empty')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan, i) => (
            <div key={plan.id} className="card-hover glass rounded-2xl p-5 flex flex-col animate-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full shrink-0" style={{ background: plan.color || '#4F7CFF' }} />
                  <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{plan.name}</h3>
                </div>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full glass" style={{ color: 'var(--text-muted)' }}>
                  {plan.duration_days} {t('common.days')}
                </span>
              </div>
              <p className="text-3xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>EGP {plan.price}</p>
              {plan.description && <p className="text-sm mt-auto" style={{ color: 'var(--text-secondary)' }}>{plan.description}</p>}
              <div className="flex gap-2 mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                <Button variant="ghost" size="sm" onPress={() => { setEditing(plan); setForm({ name: plan.name, duration_days: plan.duration_days, price: plan.price, description: plan.description || '', color: plan.color || '#4F7CFF' }); setShowForm(true) }}>
                  <i className="bi bi-pencil" /> {t('common.edit')}
                </Button>
                <Button variant="ghost" size="sm" onPress={() => setDeleteTarget(plan)}>
                  <i className="bi bi-trash" style={{ color: 'var(--danger)' }} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title={t('plans.deleteConfirm')}
        message={`${t('common.delete')} "${deleteTarget?.name}"?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
