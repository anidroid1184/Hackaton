/**
 * Mini-servidor HTTP de mocks para MiTechoRentable (aislado de Supabase/FastAPI real).
 * Reutiliza generadores del frontend para una única fuente de verdad.
 */
import http from 'node:http'
import { URL } from 'node:url'
import {
  buildMockStatsResponse,
  type AliasProfileId,
} from '../../frontend/src/lib/residentialGenerators.ts'
import { resolveMultiProfilePayload } from './multiProfileData.ts'
import { buildProviderSample, getProviderCatalog, listProviders } from './providerSim.ts'
import { effectiveAliasProfile, parseSimulationParams, type ProviderId } from './simulationParams.ts'

const PORT = Number(process.env.MOCK_HUB_PORT ?? '4010')
const SIMULATION_CONTRACT_VERSION = '2026-04-18.sim.v1'
const DEBUG_RUN_ID = 'runserver-simulate-pre-fix'

type OverrideState = {
  enabled: boolean
  params: Partial<{
    provider: ProviderId
    compareProvider: ProviderId
    scenario: string
    faultMode: 'none' | 'degraded' | 'offline' | 'spikes'
    noise: number
    scale: number
    phase: number
    profile: 'pac' | 'active_power' | 'p_total' | 'canonical'
  }>
}

const overrideState: OverrideState = { enabled: false, params: {} }

function mergedSimParams(requestParams: URLSearchParams): ReturnType<typeof parseSimulationParams> {
  const base = parseSimulationParams(requestParams)
  if (!overrideState.enabled) return base
  return {
    ...base,
    ...(overrideState.params.provider ? { provider: overrideState.params.provider } : {}),
    ...(overrideState.params.compareProvider ? { compareProvider: overrideState.params.compareProvider } : {}),
    ...(overrideState.params.scenario ? { scenario: overrideState.params.scenario } : {}),
    ...(overrideState.params.faultMode ? { faultMode: overrideState.params.faultMode } : {}),
    ...(typeof overrideState.params.noise === 'number' ? { noise: overrideState.params.noise } : {}),
    ...(typeof overrideState.params.scale === 'number' ? { scale: overrideState.params.scale } : {}),
    ...(typeof overrideState.params.phase === 'number' ? { phase: overrideState.params.phase } : {}),
    ...(overrideState.params.profile ? { profile: overrideState.params.profile } : {}),
  }
}

function readBody(req: http.IncomingMessage, limit = 16 * 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let total = 0
    req.on('data', (chunk: Buffer) => {
      total += chunk.length
      if (total > limit) {
        reject(new Error('body_too_large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
    req.on('error', reject)
  })
}

// #region agent log
function debugLog(hypothesisId: string, location: string, message: string, data: Record<string, unknown>) {
  fetch('http://127.0.0.1:7305/ingest/17122c7d-f668-47e3-8ac8-60595ac45913',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'58c209'},body:JSON.stringify({sessionId:'58c209',runId:DEBUG_RUN_ID,hypothesisId,location,message,data,timestamp:Date.now()})}).catch(()=>{});
}
// #endregion

function sendJson(res: http.ServerResponse, status: number, body: unknown) {
  const json = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  })
  res.end(json)
}

function sendText(res: http.ServerResponse, status: number, body: string, contentType: string) {
  res.writeHead(status, {
    'Content-Type': contentType,
    'Access-Control-Allow-Origin': '*',
  })
  res.end(body)
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

function growattDateTime(date: Date): string {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())} ${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}:${pad2(date.getUTCSeconds())}`
}

function buildRawAliasProviderEnvelope(
  provider: ProviderId,
  key: string,
  value: number,
  now: Date,
  scenario: string,
  faultMode: string,
  compareProvider: ProviderId,
): unknown {
  const nowMs = now.getTime()
  const nowSec = Math.floor(nowMs / 1000)

  if (provider === 'deye') {
    return {
      code: '1000000',
      msg: 'ok',
      success: true,
      requestId: `sim-deye-${nowSec}`,
      deviceDataList: [
        {
          deviceSn: '2402010117',
          collectionTime: nowSec,
          dataList: [{ key, value: String(value), unit: 'kW' }],
        },
      ],
      simulation: { scenario, faultMode, compareProvider },
    }
  }

  if (provider === 'huawei') {
    return {
      success: true,
      failCode: 0,
      message: null,
      params: { currentTime: nowMs, devIds: '1000000033685719', devTypeId: 1 },
      data: [{ devId: 1000000033685719, dataItemMap: { [key]: value } }],
      simulation: { scenario, faultMode, compareProvider },
    }
  }

  return {
    error_code: 0,
    error_msg: '',
    data: {
      serial_num: 'ABC1234567',
      [key]: String(value),
      last_update_time: growattDateTime(now),
    },
    simulation: { scenario, faultMode, compareProvider },
  }
}

function renderControlPanel(port: number): string {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"/>
<title>MiTechoRentable mock-hub · Panel</title>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
:root { color-scheme: light dark; --bg:#0f172a; --panel:#111827; --ink:#f8fafc; --muted:#94a3b8; --accent:#38bdf8; --warn:#f59e0b; --danger:#ef4444; --ok:#10b981; --border:#1f2937; }
@media (prefers-color-scheme: light) { :root { --bg:#f8fafc; --panel:#ffffff; --ink:#0f172a; --muted:#475569; --border:#e2e8f0; } }
*{box-sizing:border-box} html,body{margin:0;font-family:ui-sans-serif,system-ui,sans-serif;background:var(--bg);color:var(--ink)}
main{max-width:980px;margin:0 auto;padding:1.5rem}
h1{margin:0 0 .25rem;font-size:1.5rem;display:flex;align-items:center;gap:.6rem}
h1 .dot{display:inline-block;width:.6rem;height:.6rem;border-radius:999px;background:var(--ok);box-shadow:0 0 8px var(--ok)}
.sub{color:var(--muted);margin:0 0 1.5rem}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1rem}
.card{background:var(--panel);border:1px solid var(--border);border-radius:14px;padding:1rem 1.1rem}
.card h2{margin:0 0 .75rem;font-size:.95rem;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
label{display:block;font-size:.75rem;color:var(--muted);margin:.75rem 0 .25rem;text-transform:uppercase;letter-spacing:.05em}
select,input[type=text],input[type=number]{width:100%;background:transparent;color:var(--ink);border:1px solid var(--border);border-radius:8px;padding:.55rem .6rem;font-size:.9rem}
input[type=range]{width:100%}
.row{display:flex;align-items:center;gap:.5rem}
.val{font-variant-numeric:tabular-nums;min-width:3rem;text-align:right;color:var(--muted)}
.actions{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:1rem}
button{border:0;border-radius:999px;padding:.6rem 1rem;font-weight:600;cursor:pointer;font-size:.85rem}
.primary{background:var(--accent);color:#0b1120}
.ghost{background:transparent;border:1px solid var(--border);color:var(--ink)}
.danger{background:var(--danger);color:#fff}
.warn{background:var(--warn);color:#0b1120}
.toggle{display:flex;align-items:center;gap:.6rem;margin:.5rem 0 0}
.toggle input{width:auto}
.status{margin-top:1rem;padding:.75rem;border-radius:10px;background:var(--border);color:var(--ink);font-size:.85rem;white-space:pre-wrap;font-family:ui-monospace,monospace}
.pill{display:inline-block;padding:.15rem .55rem;border-radius:999px;font-size:.7rem;letter-spacing:.05em;text-transform:uppercase;background:var(--border);color:var(--muted)}
.pill.on{background:var(--ok);color:#052e1f}
.pill.off{background:var(--border);color:var(--muted)}
hr{border:0;border-top:1px solid var(--border);margin:1.25rem 0}
code{font-family:ui-monospace,monospace;font-size:.82rem;background:var(--border);padding:.1rem .35rem;border-radius:6px}
footer{color:var(--muted);font-size:.75rem;margin-top:1.5rem}
a{color:var(--accent)}
</style></head>
<body><main>
<h1><span class="dot"></span>MiTechoRentable · mock-hub</h1>
<p class="sub">Panel de control del simulador. Puerto <code>${port}</code>. Contract <code>${SIMULATION_CONTRACT_VERSION}</code>.</p>

<div class="grid">
  <section class="card">
    <h2>Override global <span id="enabledPill" class="pill off">desactivado</span></h2>
    <p style="color:var(--muted);font-size:.85rem;margin:.25rem 0 .5rem">Cuando está activo, estos valores pisan los query params que envíe cualquier frontend.</p>
    <label class="toggle"><input type="checkbox" id="enabled"/> <span>Activar override</span></label>

    <label for="scenario">Scenario</label>
    <select id="scenario">
      <option value="">(sin override)</option>
      <option value="baseline">baseline</option>
      <option value="normal">normal</option>
      <option value="degraded">degraded</option>
      <option value="stress">stress</option>
    </select>

    <label for="faultMode">Fault mode</label>
    <select id="faultMode">
      <option value="">(sin override)</option>
      <option value="none">none</option>
      <option value="degraded">degraded</option>
      <option value="offline">offline</option>
      <option value="spikes">spikes</option>
    </select>

    <label for="provider">Provider</label>
    <select id="provider">
      <option value="">(sin override)</option>
      <option value="huawei">huawei</option>
      <option value="deye">deye</option>
      <option value="growatt">growatt</option>
    </select>

    <label for="profile">Profile (alias)</label>
    <select id="profile">
      <option value="">(sin override)</option>
      <option value="canonical">canonical</option>
      <option value="pac">pac</option>
      <option value="active_power">active_power</option>
      <option value="p_total">p_total</option>
    </select>
  </section>

  <section class="card">
    <h2>Ajustes finos</h2>

    <label for="noise">Noise <span class="val" id="noiseVal">—</span></label>
    <div class="row"><input type="range" id="noise" min="0" max="1" step="0.05" value="0.2"/></div>

    <label for="scale">Scale <span class="val" id="scaleVal">—</span></label>
    <div class="row"><input type="range" id="scale" min="0.3" max="3" step="0.05" value="1"/></div>

    <label for="phase">Phase <span class="val" id="phaseVal">—</span></label>
    <div class="row"><input type="range" id="phase" min="0" max="1" step="0.05" value="0"/></div>

    <div class="actions">
      <button class="primary" id="applyBtn">Aplicar</button>
      <button class="ghost" id="randomBtn">Randomizar</button>
      <button class="warn" id="fault-offline">Simular fault offline</button>
      <button class="warn" id="fault-degraded">Simular degraded</button>
      <button class="danger" id="resetBtn">Reset</button>
    </div>
  </section>

  <section class="card" style="grid-column:1/-1">
    <h2>Estado actual · <a href="/sim/params" target="_blank">GET /sim/params</a></h2>
    <div id="status" class="status">cargando…</div>
  </section>

  <section class="card" style="grid-column:1/-1">
    <h2>Endpoints rápidos</h2>
    <ul style="margin:0;padding-left:1.1rem;line-height:1.7;font-size:.9rem">
      <li><a href="/health" target="_blank">/health</a> · estado del servicio</li>
      <li><a href="/sim/meta" target="_blank">/sim/meta</a> · contrato</li>
      <li><a href="/sim/time-meta" target="_blank">/sim/time-meta</a> · ventana temporal (contrato backend espejo)</li>
      <li><a href="/sim/providers" target="_blank">/sim/providers</a> · catálogo</li>
      <li><a href="/operations/fleet" target="_blank">/operations/fleet</a> · fleet operario (aplica override)</li>
      <li><a href="/operations/war-room" target="_blank">/operations/war-room</a> · alertas War Room</li>
      <li><a href="/corporate/kpis" target="_blank">/corporate/kpis</a> · cliente corporativo</li>
      <li><a href="/technician/dashboard" target="_blank">/technician/dashboard</a> · técnico de campo</li>
      <li><a href="/stats/00000000-0000-4000-8000-000000000001" target="_blank">/stats/{client_id}</a></li>
    </ul>
  </section>
</div>

<footer>Cambios aplicados desde este panel afectan a todos los frontends conectados al mock-hub. Persisten hasta reset o reinicio del servidor.</footer>
</main>
<script>
const $ = (id) => document.getElementById(id);
const fields = ['scenario','faultMode','provider','profile'];
const numeric = ['noise','scale','phase'];

function updateVal(id){ const el=$(id); const v=$(id+'Val'); if(el&&v) v.textContent=Number(el.value).toFixed(2); }
numeric.forEach(id => { $(id).addEventListener('input', () => updateVal(id)); updateVal(id); });

async function refresh(){
  const r = await fetch('/sim/params'); const data = await r.json();
  $('enabled').checked = !!data.enabled;
  $('enabledPill').textContent = data.enabled ? 'ACTIVO' : 'desactivado';
  $('enabledPill').className = 'pill ' + (data.enabled ? 'on' : 'off');
  fields.forEach(k => { if (data.params[k] !== undefined) $(k).value = data.params[k]; });
  numeric.forEach(k => { if (typeof data.params[k] === 'number') { $(k).value = data.params[k]; updateVal(k); } });
  $('status').textContent = JSON.stringify(data, null, 2);
}

async function apply(overrides){
  const body = { enabled: $('enabled').checked };
  fields.forEach(k => { body[k] = $(k).value || null; });
  numeric.forEach(k => { body[k] = parseFloat($(k).value); });
  Object.assign(body, overrides || {});
  const r = await fetch('/sim/params', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
  const data = await r.json();
  $('status').textContent = JSON.stringify(data, null, 2);
  refresh();
}

$('applyBtn').addEventListener('click', () => apply());
$('resetBtn').addEventListener('click', async () => {
  await fetch('/sim/params/reset', { method:'POST' });
  refresh();
});
$('randomBtn').addEventListener('click', () => {
  const scenarios = ['baseline','normal','degraded','stress'];
  const faults = ['none','degraded','offline','spikes'];
  $('scenario').value = scenarios[Math.floor(Math.random()*scenarios.length)];
  $('faultMode').value = faults[Math.floor(Math.random()*faults.length)];
  $('noise').value = (Math.random()*0.6).toFixed(2); updateVal('noise');
  $('scale').value = (0.7 + Math.random()*1.3).toFixed(2); updateVal('scale');
  $('phase').value = (Math.random()).toFixed(2); updateVal('phase');
  $('enabled').checked = true;
  apply();
});
$('fault-offline').addEventListener('click', () => { $('enabled').checked = true; $('scenario').value = 'stress'; $('faultMode').value = 'offline'; apply(); });
$('fault-degraded').addEventListener('click', () => { $('enabled').checked = true; $('scenario').value = 'degraded'; $('faultMode').value = 'degraded'; apply(); });

refresh();
setInterval(refresh, 5000);
</script>
</body></html>`
}

export function createServer(port = PORT): http.Server {
  return http.createServer((req, res) => {
    if (!req.url) {
      sendJson(res, 400, { error: 'missing_url' })
      return
    }

    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      })
      res.end()
      return
    }

    const url = new URL(req.url, `http://127.0.0.1:${port}`)
    const simParams = mergedSimParams(url.searchParams)

    if (req.method === 'GET' && url.pathname === '/health') {
      sendJson(res, 200, { ok: true, service: 'mock-hub', port })
      return
    }

    const multiProfilePayload = req.method === 'GET' ? resolveMultiProfilePayload(url.pathname, simParams) : null
    if (multiProfilePayload !== null) {
      sendJson(res, 200, multiProfilePayload)
      return
    }

    if (req.method === 'GET' && url.pathname === '/sim/providers') {
      sendJson(res, 200, listProviders())
      return
    }

    if (req.method === 'GET' && url.pathname === '/sim/params') {
      sendJson(res, 200, {
        enabled: overrideState.enabled,
        params: overrideState.params,
        effective: simParams,
      })
      return
    }

    if (req.method === 'POST' && url.pathname === '/sim/params/reset') {
      overrideState.enabled = false
      overrideState.params = {}
      sendJson(res, 200, { ok: true, enabled: overrideState.enabled, params: overrideState.params })
      return
    }

    if (req.method === 'POST' && url.pathname === '/sim/params') {
      void readBody(req)
        .then((raw) => {
          let body: Record<string, unknown> = {}
          try {
            body = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
          } catch {
            sendJson(res, 400, { error: 'invalid_json' })
            return
          }

          const validProviders: ProviderId[] = ['deye', 'huawei', 'growatt']
          const validFaults = ['none', 'degraded', 'offline', 'spikes'] as const
          const validProfiles = ['pac', 'active_power', 'p_total', 'canonical'] as const
          const next: OverrideState['params'] = { ...overrideState.params }

          const strField = (key: keyof OverrideState['params'], allowed?: readonly string[]) => {
            const raw = body[key]
            if (raw === null) {
              delete next[key]
              return
            }
            if (typeof raw !== 'string') return
            const value = raw.trim().toLowerCase()
            if (!value) {
              delete next[key]
              return
            }
            if (allowed && !allowed.includes(value)) return
            // @ts-expect-error discriminated union assign
            next[key] = value
          }

          strField('provider', validProviders)
          strField('compareProvider', validProviders)
          strField('faultMode', validFaults)
          strField('profile', validProfiles)

          if ('scenario' in body) {
            const raw = body.scenario
            if (raw === null) delete next.scenario
            else if (typeof raw === 'string') {
              const value = raw.trim().toLowerCase()
              if (!value) delete next.scenario
              else if (/^[a-z0-9_-]{2,32}$/.test(value)) next.scenario = value
            }
          }

          const numField = (key: 'noise' | 'scale' | 'phase', min: number, max: number) => {
            if (!(key in body)) return
            const raw = body[key]
            if (raw === null) {
              delete next[key]
              return
            }
            const num = typeof raw === 'number' ? raw : parseFloat(String(raw))
            if (!Number.isFinite(num)) return
            next[key] = Math.min(max, Math.max(min, num))
          }

          numField('noise', 0, 1)
          numField('scale', 0.3, 3)
          numField('phase', 0, 1)

          if (typeof body.enabled === 'boolean') overrideState.enabled = body.enabled
          overrideState.params = next

          sendJson(res, 200, {
            ok: true,
            enabled: overrideState.enabled,
            params: overrideState.params,
          })
        })
        .catch(() => {
          sendJson(res, 400, { error: 'body_read_error' })
        })
      return
    }

    if (req.method === 'GET' && url.pathname === '/sim/meta') {
      sendJson(res, 200, {
        contractVersion: SIMULATION_CONTRACT_VERSION,
        service: 'mock-hub',
        queryParams: {
          statsAndRoles: ['provider', 'compareProvider', 'scenario', 'faultMode', 'noise', 'scale', 'phase', 'profile'],
          providerSamples: ['provider', 'compareProvider', 'scenario', 'faultMode', 'noise', 'scale', 'phase', 'profile'],
        },
        context: {
          provider: simParams.provider,
          compareProvider: simParams.compareProvider,
          scenario: simParams.scenario,
          faultMode: simParams.faultMode,
        },
      })
      return
    }

    const providerCatalogMatch = url.pathname.match(/^\/sim\/providers\/([^/]+)\/catalog\/?$/)
    if (req.method === 'GET' && providerCatalogMatch) {
      const provider = providerCatalogMatch[1]
      if (provider !== 'deye' && provider !== 'huawei' && provider !== 'growatt') {
        sendJson(res, 404, { error: 'provider_not_found', provider })
        return
      }
      sendJson(res, 200, getProviderCatalog(provider))
      return
    }

    const providerSampleMatch = url.pathname.match(/^\/sim\/providers\/([^/]+)\/sample\/([^/]+)\/?$/)
    if (req.method === 'GET' && providerSampleMatch) {
      const provider = providerSampleMatch[1]
      if (provider !== 'deye' && provider !== 'huawei' && provider !== 'growatt') {
        sendJson(res, 404, { error: 'provider_not_found', provider })
        return
      }
      const entity = providerSampleMatch[2]
      const sample = buildProviderSample(provider, entity, simParams)
      if (!sample) {
        sendJson(res, 404, { error: 'entity_not_found', provider, entity })
        return
      }
      sendJson(res, 200, sample)
      return
    }

    const statsMatch = url.pathname.match(/^\/stats\/([^/]+)\/?$/)
    if (req.method === 'GET' && statsMatch) {
      const clientId = statsMatch[1]
      const profile: AliasProfileId = effectiveAliasProfile(simParams.provider, simParams.profile)
      const payload = buildMockStatsResponse(clientId, { ...simParams, profile })
      const now = new Date()
      const rawEntry = Object.entries(payload.raw_alias_demo.values)[0]
      const rawKey = rawEntry?.[0] ?? 'p_active_kw'
      const rawValue = typeof rawEntry?.[1] === 'number' ? rawEntry[1] : 0

      payload.raw_alias_demo = {
        ...payload.raw_alias_demo,
        ts: now.toISOString(),
        provider: simParams.provider,
        provider_envelope: buildRawAliasProviderEnvelope(
          simParams.provider,
          rawKey,
          rawValue,
          now,
          simParams.scenario,
          simParams.faultMode,
          simParams.compareProvider,
        ),
      }

      sendJson(res, 200, payload)
      return
    }

    if (req.method === 'GET' && url.pathname === '/') {
      sendText(res, 200, renderControlPanel(port), 'text/html; charset=utf-8')
      return
    }

    if (req.method === 'GET' && url.pathname === '/sim/health') {
      const seedTick = Math.floor(Date.now() / 5000)
      sendJson(res, 200, { ok: true, seedTick, service: 'mock-hub', port: PORT })
      return
    }

    if (req.method === 'GET' && url.pathname === '/sim/time-meta') {
      const now = new Date()
      const earliest = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      const toZulu = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, 'Z')
      sendJson(res, 200, {
        earliest: toZulu(earliest),
        latest: toZulu(now),
        now: toZulu(now),
        defaultPreset: '24h',
        presets: ['24h', '7d', '30d', 'custom'],
        contractVersion: SIMULATION_CONTRACT_VERSION,
      })
      return
    }

    sendJson(res, 404, { error: 'not_found', path: url.pathname })
  })
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  // #region agent log
  debugLog('H2', 'mock-hub/src/server.ts:entrypoint', 'mock-hub entrypoint start', {
    envMockHubPortRaw: process.env.MOCK_HUB_PORT ?? null,
    resolvedPort: PORT,
    argv1: process.argv[1] ?? null,
  })
  // #endregion
  const server = createServer(PORT)
  // #region agent log
  server.on('error', (error: NodeJS.ErrnoException) => {
    debugLog('H5', 'mock-hub/src/server.ts:server.error', 'mock-hub listen error', {
      code: error.code ?? null,
      errno: error.errno ?? null,
      syscall: error.syscall ?? null,
      address: error.address ?? null,
      port: error.port ?? null,
      message: error.message,
    })
  })
  // #endregion
  server.listen(PORT, () => {
    // #region agent log
    debugLog('H3', 'mock-hub/src/server.ts:server.listen', 'mock-hub listening', {
      port: PORT,
    })
    // #endregion
    console.error(`[mock-hub] listening on http://127.0.0.1:${PORT}`)
  })
}
