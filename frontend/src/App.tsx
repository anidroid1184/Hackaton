import { Fragment, useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { DashboardNaturalPage } from './pages/DashboardNaturalPage'
import { NaturalAgendaPage } from './pages/NaturalAgendaPage'
import { PerformanceNaturalPage } from './pages/PerformanceNaturalPage'
import { MockHubPlaygroundPage } from './pages/MockHubPlaygroundPage'
import { ReportsNaturalPage } from './pages/ReportsNaturalPage'
import { PdfGeneratorNaturalPage } from './pages/PdfGeneratorNaturalPage'
import { SupportNaturalPage } from './pages/SupportNaturalPage'
import { UserProfilePage } from './pages/UserProfilePage'
import { OperationsFleetPage } from './pages/OperationsFleetPage'
import { OperationsPlantDetailPage } from './pages/OperationsPlantDetailPage'
import { OperationsSchedulePage } from './pages/OperationsSchedulePage'
import { OperationsWarRoomPage } from './pages/OperationsWarRoomPage'
import { OperationsRegionalAnalyticsPage } from './pages/OperationsRegionalAnalyticsPage'
import { OperationsTechniciansPage } from './pages/OperationsTechniciansPage'
import { OperationsComparePlantsPage } from './pages/OperationsComparePlantsPage'
import { CorporateClientPage } from './pages/CorporateClientPage'
import { FieldTechnicianRoutePage } from './pages/FieldTechnicianRoutePage'
import { FieldTechnicianTelemetryPage } from './pages/FieldTechnicianTelemetryPage'
import { FieldTechnicianHealthPage } from './pages/FieldTechnicianHealthPage'
import { FieldTechnicianClosePage } from './pages/FieldTechnicianClosePage'
import { ProtectedRoute, RedirectIfAuthed } from './auth/ProtectedRoute'
import { AppShell } from './components/AppShell'
import { MOCK_SCENARIO_STORAGE_KEY } from './lib/naturalStatsApi'
import { MOCK_SCENARIO_CHANGE_EVENT } from './hooks/useResidentialNatural'
import {
  SIMULATION_CONTEXT_CHANGE_EVENT,
  SIMULATION_CONTEXT_STORAGE_KEY,
} from './lib/simulationContext'
import {
  TIME_WINDOW_CHANGE_EVENT,
  TIME_WINDOW_STORAGE_KEY,
} from './hooks/useTimeWindow'

/**
 * Routing principal.
 *
 * Público (si NO hay sesión): /, /login, /register.
 * Si el usuario ya tiene sesión, estas rutas redirigen a /dashboard.
 *
 * Protegido (requiere sesión): /dashboard y sub-secciones bajo AppShell.
 * Si no hay sesión, redirige a /login con `from` para volver tras auth.
 */
export default function App() {
  const [simulationVersion, setSimulationVersion] = useState(0)

  useEffect(() => {
    const triggerRefresh = () => setSimulationVersion((value) => value + 1)
    const onStorage = (event: StorageEvent) => {
      if (
        event.key === MOCK_SCENARIO_STORAGE_KEY ||
        event.key === SIMULATION_CONTEXT_STORAGE_KEY ||
        event.key === TIME_WINDOW_STORAGE_KEY
      ) {
        triggerRefresh()
      }
    }
    window.addEventListener(MOCK_SCENARIO_CHANGE_EVENT, triggerRefresh)
    window.addEventListener(SIMULATION_CONTEXT_CHANGE_EVENT, triggerRefresh)
    window.addEventListener(TIME_WINDOW_CHANGE_EVENT, triggerRefresh)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(MOCK_SCENARIO_CHANGE_EVENT, triggerRefresh)
      window.removeEventListener(SIMULATION_CONTEXT_CHANGE_EVENT, triggerRefresh)
      window.removeEventListener(TIME_WINDOW_CHANGE_EVENT, triggerRefresh)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  return (
    <Fragment key={simulationVersion}>
      <Routes>
      <Route
        path="/"
        element={
          <RedirectIfAuthed>
            <LandingPage />
          </RedirectIfAuthed>
        }
      />
      <Route
        path="/login"
        element={
          <RedirectIfAuthed>
            <LoginPage />
          </RedirectIfAuthed>
        }
      />
      <Route
        path="/register"
        element={
          <RedirectIfAuthed>
            <RegisterPage />
          </RedirectIfAuthed>
        }
      />

      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardNaturalPage />} />
        <Route path="/agenda" element={<NaturalAgendaPage />} />
        <Route path="/analytics" element={<PerformanceNaturalPage />} />
        <Route path="/reports" element={<ReportsNaturalPage />} />
        <Route path="/reports/pdf" element={<PdfGeneratorNaturalPage />} />
        <Route path="/support" element={<SupportNaturalPage />} />
        <Route path="/profile" element={<UserProfilePage />} />
        {import.meta.env.DEV ? (
          <Route path="/dev/mock-hub" element={<MockHubPlaygroundPage />} />
        ) : null}
      </Route>

      <Route
        element={
          <ProtectedRoute requiredRole="operaciones">
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/operaciones/dashboard" element={<OperationsFleetPage />} />
        <Route path="/operaciones/plants/:plantId" element={<OperationsPlantDetailPage />} />
        <Route path="/operaciones/agenda" element={<OperationsSchedulePage />} />
        <Route path="/operaciones/war-room" element={<OperationsWarRoomPage />} />
        <Route path="/operaciones/analytics" element={<OperationsRegionalAnalyticsPage />} />
        <Route path="/operaciones/tecnicos" element={<OperationsTechniciansPage />} />
        <Route path="/operaciones/compare" element={<OperationsComparePlantsPage />} />
        <Route path="/operaciones/profile" element={<UserProfilePage />} />
      </Route>

      <Route
        element={
          <ProtectedRoute requiredRole="corporativo">
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/corporativo/dashboard" element={<CorporateClientPage />} />
        <Route path="/corporativo/profile" element={<UserProfilePage />} />
      </Route>

      <Route
        element={
          <ProtectedRoute requiredRole="tecnico">
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/tecnico/ruta" element={<FieldTechnicianRoutePage />} />
        <Route path="/tecnico/telemetria" element={<FieldTechnicianTelemetryPage />} />
        <Route path="/tecnico/salud" element={<FieldTechnicianHealthPage />} />
        <Route path="/tecnico/cierre" element={<FieldTechnicianClosePage />} />
        <Route path="/tecnico/profile" element={<UserProfilePage />} />
      </Route>

      <Route element={<AppShell mode="demo" />}>
        <Route path="/preview/cliente/dashboard" element={<DashboardNaturalPage />} />
        <Route path="/preview/cliente/agenda" element={<NaturalAgendaPage />} />
        <Route path="/preview/cliente/analytics" element={<PerformanceNaturalPage />} />
        <Route path="/preview/cliente/reports" element={<ReportsNaturalPage />} />
        <Route path="/preview/cliente/reports/pdf" element={<PdfGeneratorNaturalPage />} />
        <Route path="/preview/cliente/support" element={<SupportNaturalPage />} />
        <Route path="/preview/cliente/profile" element={<UserProfilePage />} />
        <Route path="/preview/operaciones/compare" element={<OperationsComparePlantsPage />} />
        <Route path="/preview/corporativo/dashboard" element={<CorporateClientPage />} />
        <Route path="/preview/corporativo/profile" element={<UserProfilePage />} />
        <Route path="/preview/tecnico/ruta" element={<FieldTechnicianRoutePage />} />
        <Route path="/preview/tecnico/telemetria" element={<FieldTechnicianTelemetryPage />} />
        <Route path="/preview/tecnico/salud" element={<FieldTechnicianHealthPage />} />
        <Route path="/preview/tecnico/cierre" element={<FieldTechnicianClosePage />} />
        <Route path="/preview/tecnico/profile" element={<UserProfilePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Fragment>
  )
}
