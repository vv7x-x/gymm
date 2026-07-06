import { useEffect, useState } from 'react'
import { Button } from '@heroui/react'
import { supabase } from '../lib/supabase'
import { useI18n } from '../contexts/I18nContext'
import { useToast } from '../contexts/ToastContext'
import { pick } from '../lib/utils'
import ConfirmModal from '../components/ConfirmModal'
import type { Branch } from '../types'

export default function Branches() {
  const { t } = useI18n()
  const { toast } = useToast()
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Branch | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null)
  const [form, setForm] = useState({ name: '', address: '', phone: '' })

  useEffect(() => { loadBranches() }, [])

  async function loadBranches() {
    try {
      const { data } = await supabase.from('branches').select('*').order('name')
      setBranches(data || [])
    } finally { setLoading(false) }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const allowed = pick(form, ['name', 'address', 'phone'])
      if (editing) {
        await supabase.from('branches').update(allowed).eq('id', editing.id)
      } else {
        await supabase.from('branches').insert(allowed)
      }
      toast(editing ? t('branches.saved') : t('branches.saved'), 'success')
      setShowForm(false); setEditing(null)
      setForm({ name: '', address: '', phone: '' })
      loadBranches()
    } catch { toast(t('common.error'), 'error') } finally { setSaving(false) }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await supabase.from('branches').update({ is_active: false }).eq('id', deleteTarget.id)
      toast(t('branches.deleted'), 'success')
      setDeleteTarget(null)
      loadBranches()
    } catch { toast(t('common.error'), 'error') }
  }

  return (
    <div className="p-8 space-y-6 animate-fade-up">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>{t('branches.title')}</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('branches.total')}: {branches.length}</p>
        </div>
        <Button variant="primary" onPress={() => { setEditing(null); setForm({ name: '', address: '', phone: '' }); setShowForm(true) }}>
          <i className="bi bi-plus" /> {t('branches.add')}
        </Button>
      </div>

      {showForm && (
        <div className="rounded-2xl border p-6 animate-scale-in" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>{editing ? t('common.edit') : t('branches.add')}</h3>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>{t('branches.name')}</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required maxLength={100}
                  className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  style={{ background: 'var(--bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>{t('branches.phone')}</label>
                <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} maxLength={20}
                  className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  style={{ background: 'var(--bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>{t('branches.address')}</label>
                <textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} rows={2} maxLength={500}
                  className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none"
                  style={{ background: 'var(--bg)', color: 'var(--text-primary)', borderColor: 'var(--border)' }} />
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
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
        </div>
      ) : branches.length === 0 ? (
        <div className="text-center py-20" style={{ color: 'var(--text-muted)' }}>
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl flex items-center justify-center" style={{ background: 'var(--bg)' }}>
            <i className="bi bi-building text-2xl" />
          </div>
          <h3 className="text-lg font-medium">{t('branches.empty')}</h3>
        </div>
      ) : (
        <div className="space-y-3">
          {branches.map((b, i) => (
            <div key={b.id} className="card-hover rounded-2xl border p-4 flex items-center justify-between animate-fade-up"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-card)', animationDelay: `${i * 50}ms` }}>
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white" style={{ background: 'var(--gradient-1)' }}>
                  <i className="bi bi-building" />
                </div>
                <div>
                  <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{b.name}</h3>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{b.address || b.phone || '-'}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" isIconOnly size="sm" onPress={() => { setEditing(b); setForm({ name: b.name, address: b.address || '', phone: b.phone || '' }); setShowForm(true) }}>
                  <i className="bi bi-pencil" />
                </Button>
                <Button variant="ghost" isIconOnly size="sm" onPress={() => setDeleteTarget(b)}>
                  <i className="bi bi-trash" style={{ color: 'var(--danger)' }} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        title={t('branches.deleteConfirm')}
        message={`${t('common.delete')} "${deleteTarget?.name}"?`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
