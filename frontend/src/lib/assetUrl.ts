/**
 * Construye URL absoluta para assets estáticos respetando VITE_BASE_URL.
 *
 * GitHub Pages sirve en /<repo-name>/; Vite reescribe `index.html` pero NO
 * strings literales en JSX/TSX.  Este helper asegura que cualquier path
 * como `/mascota.png` se resuelva a `/Hackaton/mascota.png` en deploy.
 */
export function assetUrl(path: string): string {
  const base = import.meta.env.BASE_URL ?? '/'
  // Evitar doble slash cuando base ya termina con /
  const cleanBase = base.endsWith('/') ? base : `${base}/`
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  return `${cleanBase}${cleanPath}`
}
