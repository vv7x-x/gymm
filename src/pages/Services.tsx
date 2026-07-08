import { useEffect, useState } from 'react'
import { Button } from '@heroui/react'
import { supabase } from '../lib/supabase'
import { useI18n } from '../contexts/I18nContext'
import { useToast } from '../contexts/ToastContext'
import { pick } from '../lib/utils'
import ConfirmModal from '../components/ConfirmModal'
import type { Service } from '../types'

export default function Services() {
  const { t } = useI18n()
  const { toast } = useToast()
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Service | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null)
  const [form, setForm] = useState({ name: '', price: 0, description: '' })

  useEffect(() => { loadServices() }, [])

  async function loadServices() {
    try {
      const { data } = await supabase.from('services').select('*').order('name')
      setServices(data || [])
    } finally { setLoading(false) }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const allowed = pick(form, ['name', 'price', 'description'])
      if (editing) {
        await supabase.from('services').update(allowed).eq('id', editing.id)
      } else {
        await supabase.from('services').insert(allowed)
      }
      toast(editing ? t('services.saved') : t('services.saved'), 'success')
      setShowForm(false); setEditing(null)
      setForm({ name: '', price: 0, description: '' })
      loadServices()
    } catch { toast(t('common.error'), 'error') } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await supabase.from('services').delete().eq('id', deleteTarget.id)
      toast(t('services.deleted'), 'success')
      setDeleteTarget(null)
      loadServices()
    } catch { toast(t('common.error'), 'error') }
  }

  return (
    <div className="p-8 space-y-6 animate-fade-up">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>{t('services.title')}</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('services.total')}: {services.length}</p>
        </div>
        <Button variant="primary" onPress={() => { setEditing(null); setForm({ name: '', price: 0, description: '' }); setShowForm(true) }}>
          <i className="bi bi-plus" /> {t('services.add')}
        </Button>
      </div>

      {showForm && (
        <div className="glass rounded-2xl p-6 animate-scale-in">
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>{t('services.name')}</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required maxLength={100}
                  className="form-input" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>{t('services.price')}</label>
                <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: +e.target.value }))} required min={0} step="0.01"
                  className="form-input" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>{t('services.description')}</label>
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
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
        </div>
      ) : services.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><i className="bi bi-gear" /></div>
          <p className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>{t('services.empty')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((s, i) => (
            <div key={s.id} className="card-hover glass rounded-2xl p-5 animate-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{s.name}</h3>
                <p className="text-xl font-bold" style={{ color: 'var(--primary)' }}>EGP {s.price}</p>
              </div>
              {s.description && <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{s.description}</p>}
              <div className="flex gap-2 mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
                <Button variant="ghost" size="sm" onPress={() => { setEditing(s); setForm({ name: s.name, price: s.price, description: s.description || '' }); setShowForm(true) }}>
                  <i className="bi bi-pencil" /> {t('common.edit')}
                </Button>
                <Button variant="ghost" size="sm" onPress={() => setDeleteTarget(s)}>
                  <i className="bi bi-trash" style={{ color: 'var(--danger)' }} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title={t('services.deleteConfirm')}
        message={`${t('common.delete')} "${deleteTarget?.name}"?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
