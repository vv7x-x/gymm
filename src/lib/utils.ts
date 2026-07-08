import { supabase } from './supabase'
import { STORAGE_BUCKET } from './config'
import type { SubscriptionStatus } from '../types'

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export function pick<T extends Record<string, unknown>, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key]
    }
  }
  return result
}

export function sanitize(str: string | null | undefined): string {
  if (!str) return ''
  const el = document.createElement('div')
  el.textContent = str
  return el.innerHTML
}

export function validateFile(file: File): string | null {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return `Invalid file type: ${file.type}. Allowed: JPEG, PNG, WebP, AVIF`
  }
  if (file.size > MAX_FILE_SIZE) {
    return `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: 5MB`
  }
  return null
}

export function formatDate(dateStr: string | null | undefined, lang: string = 'en'): string {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export function formatDateISO(date: string | Date | null | undefined): string {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  return d.toISOString().split('T')[0]
}

export function formatCurrency(amount: number | null | undefined, currency: string = 'EGP'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount || 0)
}

export function calculateEndDate(startDate: string, durationDays: number): string {
  const d = new Date(startDate)
  if (isNaN(d.getTime())) return ''
  d.setDate(d.getDate() + durationDays)
  return d.toISOString().split('T')[0]
}

export function calculateDaysRemaining(endDate: string | null | undefined): number {
  if (!endDate) return 0
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const end = new Date(endDate)
  end.setHours(0, 0, 0, 0)
  if (isNaN(end.getTime())) return 0
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function getSubscriptionStatus(endDate: string | null | undefined): SubscriptionStatus {
  const days = calculateDaysRemaining(endDate)
  if (days <= 0) return 'expired'
  if (days <= 7) return 'expiring_soon'
  return 'active'
}

export function generateMemberId(): string {
  const prefix = 'GYM'
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  const num = String(100000 + (buf[0] % 900000))
  return `${prefix}${num}`
}

export function getMemberPhotoUrl(url: string | null | undefined): string {
  return url || ''
}

export async function uploadPhoto(file: File): Promise<string | null> {
  const validationError = validateFile(file)
  if (validationError) {
    console.warn('[upload]', validationError)
    return null
  }
  try {
    const safeExt = file.type.split('/')[1] || 'jpg'
    const path = `photos/${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${safeExt}`
    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file)
    if (error) throw error
    const { data: { publicUrl } } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path)
    return publicUrl
  } catch (e) {
    console.error('[upload]', e)
    return null
  }
}

export async function deletePhoto(url: string): Promise<void> {
  if (!url) return
  try {
    const parts = url.split('/')
    const path = parts.slice(parts.indexOf(STORAGE_BUCKET) + 1).join('/')
    if (path) {
      await supabase.storage.from(STORAGE_BUCKET).remove([path])
    }
  } catch (e) {
    console.error('[deletePhoto]', e)
  }
}

export function getErrorMessage(error: unknown): string {
  if (!error) return 'An unexpected error occurred'
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message
  return 'An unexpected error occurred'
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function validatePhone(phone: string): boolean {
  return /^[+\d\s\-()]{7,20}$/.test(phone)
}
