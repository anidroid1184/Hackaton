import type { AppRole } from '../auth/mockOperationsAuth'

export const DEFAULT_ENERGY_RATE_COP_KWH = 765

export type EditableUserProfile = {
  name: string
  email: string
  phone: string
  zone: string
  supportEmailOptIn: boolean
  supportWhatsappOptIn: boolean
  energyRateCopKwh: number
}

type StorageReader = Pick<Storage, 'getItem'>
type StorageWriter = Pick<Storage, 'setItem'>

export function buildUserProfileStorageKey(role: AppRole | null | undefined, email?: string): string {
  return `solarpulse.profile.${role ?? 'cliente'}.${(email ?? 'anon').trim().toLowerCase() || 'anon'}`
}

export function getDefaultUserProfile(user: {
  displayName?: string
  email?: string
}): EditableUserProfile {
  return {
    name: user.displayName ?? 'Usuario',
    email: user.email ?? '',
    phone: '',
    zone: 'Sin zona',
    supportEmailOptIn: true,
    supportWhatsappOptIn: false,
    energyRateCopKwh: DEFAULT_ENERGY_RATE_COP_KWH,
  }
}

function sanitizeEnergyRate(value: unknown, fallback: number): number {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback
  return Math.round(numeric)
}

export function loadUserProfileFromStorage(
  storageKey: string,
  fallback: EditableUserProfile,
  storage: StorageReader = window.localStorage,
): EditableUserProfile {
  const raw = storage.getItem(storageKey)
  if (!raw) return fallback
  try {
    const parsed = JSON.parse(raw) as Partial<EditableUserProfile>
    return {
      ...fallback,
      ...parsed,
      supportEmailOptIn: parsed.supportEmailOptIn ?? fallback.supportEmailOptIn,
      supportWhatsappOptIn: parsed.supportWhatsappOptIn ?? fallback.supportWhatsappOptIn,
      energyRateCopKwh: sanitizeEnergyRate(parsed.energyRateCopKwh, fallback.energyRateCopKwh),
    }
  } catch {
    return fallback
  }
}

export function saveUserProfileToStorage(
  storageKey: string,
  profile: EditableUserProfile,
  storage: StorageWriter = window.localStorage,
) {
  storage.setItem(
    storageKey,
    JSON.stringify({
      ...profile,
      energyRateCopKwh: sanitizeEnergyRate(profile.energyRateCopKwh, DEFAULT_ENERGY_RATE_COP_KWH),
    }),
  )
}

export function calculateSavingsCop(kwh: number, energyRateCopKwh: number): number {
  if (!Number.isFinite(kwh) || !Number.isFinite(energyRateCopKwh)) return 0
  return Math.max(0, Math.round(kwh * energyRateCopKwh))
}
