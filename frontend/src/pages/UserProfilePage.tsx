import { useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { NaturalPageHero } from '../components/natural/NaturalPageHero'
import {
  buildUserProfileStorageKey,
  getDefaultUserProfile,
  loadUserProfileFromStorage,
  saveUserProfileToStorage,
  type EditableUserProfile,
} from '../lib/userProfileStorage'

export function UserProfilePage() {
  const { user } = useAuth()
  const storageKey = useMemo(() => buildUserProfileStorageKey(user?.role, user?.email), [user?.email, user?.role])

  const [profile, setProfile] = useState<EditableUserProfile>(() =>
    loadUserProfileFromStorage(storageKey, getDefaultUserProfile(user ?? {})),
  )
  const [saved, setSaved] = useState(false)

  function onSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    saveUserProfileToStorage(storageKey, profile)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1800)
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 animate-enter">
      <NaturalPageHero
        eyebrow="Perfil de cuenta"
        title="Editar perfil"
        description="Actualiza tus datos personales y preferencias de contacto para soporte y notificaciones."
      />

      <form className="card grid gap-4 p-6" onSubmit={onSave}>
        <label className="text-sm text-on-surface-variant">
          Nombre
          <input
            className="input mt-1"
            value={profile.name}
            onChange={(event) => setProfile((prev) => ({ ...prev, name: event.target.value }))}
          />
        </label>
        <label className="text-sm text-on-surface-variant">
          Email
          <input
            className="input mt-1"
            value={profile.email}
            onChange={(event) => setProfile((prev) => ({ ...prev, email: event.target.value }))}
          />
        </label>
        <label className="text-sm text-on-surface-variant">
          Teléfono
          <input
            className="input mt-1"
            value={profile.phone}
            onChange={(event) => setProfile((prev) => ({ ...prev, phone: event.target.value }))}
          />
        </label>
        <label className="text-sm text-on-surface-variant">
          Zona principal
          <input
            className="input mt-1"
            value={profile.zone}
            onChange={(event) => setProfile((prev) => ({ ...prev, zone: event.target.value }))}
          />
        </label>
        <label className="text-sm text-on-surface-variant">
          Tarifa/costo energético (COP por kWh)
          <input
            type="number"
            className="input mt-1"
            inputMode="decimal"
            min={1}
            step={1}
            value={profile.energyRateCopKwh}
            onChange={(event) =>
              setProfile((prev) => ({
                ...prev,
                energyRateCopKwh: Number(event.target.value) || prev.energyRateCopKwh,
              }))
            }
          />
          <span className="mt-1 block text-xs text-on-surface-variant/80">
            Esta tarifa se usa para calcular tu ahorro real en el dashboard.
          </span>
        </label>
        <div className="rounded-xl border border-outline-ghost bg-surface-container-lowest p-4">
          <p className="text-sm font-semibold text-on-surface">Preferencias de contacto soporte/PQRS</p>
          <label className="mt-3 inline-flex min-h-11 cursor-pointer items-center gap-3 text-sm text-on-surface-variant">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[var(--color-primary)]"
              checked={profile.supportEmailOptIn}
              onChange={(event) =>
                setProfile((prev) => ({ ...prev, supportEmailOptIn: event.target.checked }))
              }
            />
            Recibir actualizaciones por correo
          </label>
          <label className="mt-2 inline-flex min-h-11 cursor-pointer items-center gap-3 text-sm text-on-surface-variant">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[var(--color-primary)]"
              checked={profile.supportWhatsappOptIn}
              onChange={(event) =>
                setProfile((prev) => ({ ...prev, supportWhatsappOptIn: event.target.checked }))
              }
            />
            Recibir notificaciones por WhatsApp
          </label>
        </div>
        <button className="btn-primary mt-2" type="submit">
          Guardar cambios
        </button>
        {saved ? (
          <p className="rounded-xl bg-secondary-container/70 px-3 py-2 text-sm text-on-secondary-container">
            Perfil actualizado.
          </p>
        ) : null}
      </form>
    </div>
  )
}
