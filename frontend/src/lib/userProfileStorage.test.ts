import { describe, expect, it } from 'vitest'
import {
  DEFAULT_ENERGY_RATE_COP_KWH,
  buildUserProfileStorageKey,
  calculateSavingsCop,
  getDefaultUserProfile,
  loadUserProfileFromStorage,
} from './userProfileStorage'

describe('userProfileStorage', () => {
  it('construye la key de perfil con role y email normalizado', () => {
    expect(buildUserProfileStorageKey('cliente', 'User@Test.COM')).toBe(
      'solarpulse.profile.cliente.user@test.com',
    )
  })

  it('retorna defaults con tarifa base si no viene email', () => {
    const profile = getDefaultUserProfile({ displayName: 'Camila', email: '' })
    expect(profile.name).toBe('Camila')
    expect(profile.energyRateCopKwh).toBe(DEFAULT_ENERGY_RATE_COP_KWH)
  })

  it('rehidrata perfil legacy y completa energyRateCopKwh', () => {
    const fallback = getDefaultUserProfile({ displayName: 'Camila', email: 'camila@test.com' })
    const storage = new Map<string, string>()
    storage.set(
      'profile-key',
      JSON.stringify({
        name: 'Camila R',
        email: 'camila@test.com',
        phone: '300',
        zone: 'Norte',
        supportEmailOptIn: false,
      }),
    )

    const profile = loadUserProfileFromStorage('profile-key', fallback, {
      getItem: (key) => storage.get(key) ?? null,
    })

    expect(profile.name).toBe('Camila R')
    expect(profile.supportEmailOptIn).toBe(false)
    expect(profile.supportWhatsappOptIn).toBe(false)
    expect(profile.energyRateCopKwh).toBe(DEFAULT_ENERGY_RATE_COP_KWH)
  })

  it('calcula ahorro COP redondeando a entero', () => {
    expect(calculateSavingsCop(18.6, 765.2)).toBe(14233)
    expect(calculateSavingsCop(0, 900)).toBe(0)
  })
})
