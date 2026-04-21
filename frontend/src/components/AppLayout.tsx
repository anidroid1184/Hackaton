import { NavLink, Outlet } from 'react-router-dom'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded px-2 py-1 text-sm ${isActive ? 'bg-[var(--accent-bg)] text-[var(--text-h)]' : 'text-[var(--text)] hover:bg-[var(--social-bg)]'}`

export default function AppLayout() {
  return (
    <div className="flex min-h-svh flex-col bg-[var(--bg)] text-[var(--text)]">
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--bg)] px-3 py-2">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2">
          <span className="font-semibold text-[var(--text-h)]">SolarPulse</span>
          <span className="text-xs text-[var(--text)] opacity-70">(demo navegación)</span>
          <nav className="flex flex-wrap gap-1" aria-label="Principal">
            <NavLink to="/login" className={linkClass}>
              Login
            </NavLink>
            <NavLink to="/cliente/natural" className={linkClass}>
              Cliente residencial
            </NavLink>
            <NavLink to="/cliente/corporativo" className={linkClass}>
              Cliente corporativo
            </NavLink>
            <NavLink to="/operaciones" className={linkClass}>
              Operaciones TR
            </NavLink>
            <NavLink to="/tecnico" className={linkClass}>
              Técnico de Campo
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-3 py-4">
        <Outlet />
      </main>
    </div>
  )
}
