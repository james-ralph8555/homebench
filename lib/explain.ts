import { Table as ArrowTable } from 'apache-arrow'
import { executeReadQuery, executeReadQuerySequence } from '@/lib/durableOperations'

export type PlanNode = {
  name: string
  timingMs?: number
  rows?: number
  extra?: Record<string, any>
  children: PlanNode[]
}

type ExplainResult = {
  text: string
  root?: PlanNode
}

// Extract plan text from an Arrow table. Prefer value column if present.
function tableToPlanText(table: ArrowTable): string {
  if (!table || table.numCols === 0 || table.numRows === 0) return ''

  // Try to find a likely "value" column
  const fields = table.schema?.fields || []
  const names = fields.map(f => f.name?.toLowerCase?.() || '')

  let colIndex = 0
  // Prefer common value column names
  const preferred = ['explain_value', 'value', 'plan', 'query_plan', 'physical_plan', 'logical_plan']
  for (const cand of preferred) {
    const idx = names.indexOf(cand)
    if (idx !== -1) { colIndex = idx; break }
  }
  // If there are exactly two columns and we didn't match, use the second as value
  if (table.numCols === 2 && colIndex === 0 && names[0] !== names[1]) {
    colIndex = 1
  }

  const col = table.getChildAt(colIndex)!
  const lines: string[] = []
  for (let i = 0; i < table.numRows; i++) {
    const v: any = col.get(i)
    lines.push(String(v ?? ''))
  }
  return lines.join('\n')
}

// Heuristic extraction of a plan node from unknown DuckDB JSON variants
function extractNode(obj: any): PlanNode {
  if (!obj || typeof obj !== 'object') {
    return { name: 'Unknown', children: [] }
  }

  const name = (obj.name || obj.type || obj.operator || 'Node') as string

  // Try to find timing in ms from common fields or parse strings like "12.3 ms"
  let timingMs: number | undefined
  const t = obj.time || obj.timing || obj.timing_ms || obj.time_ms || obj['actual-time']
  if (typeof t === 'number') timingMs = t
  else if (typeof t === 'string') {
    const m = t.match(/([0-9]+(?:\.[0-9]+)?)\s*ms/i)
    if (m) timingMs = parseFloat(m[1])
  }

  // Row count if present
  let rows: number | undefined
  const r = obj.rows || obj.cardinality || obj['actual-rows']
  if (typeof r === 'number') rows = r

  // Children arrays under common keys
  const childArrays: any[] = []
  if (Array.isArray(obj.children)) childArrays.push(...obj.children)
  if (Array.isArray(obj.subplan)) childArrays.push(...obj.subplan)

  const children: PlanNode[] = childArrays.map(extractNode)

  // Strip noisy keys to keep a compact extra
  const { children: _c1, subplan: _c2, name: _n, type: _t, operator: _o, time: _ti, timing: _tg, timing_ms: _tms, time_ms: _tms2, rows: _r, cardinality: _c, 'actual-rows': _ar, 'actual-time': _at, ...rest } = obj

  return { name, timingMs, rows, extra: rest, children }
}

// Try to locate the root node within various JSON shapes
function findRoot(json: any): PlanNode | undefined {
  if (!json) return undefined
  // Common shapes: { plan: {...} }, { name, children }, [ {...} ]
  if (json.plan) return extractNode(json.plan)
  if (Array.isArray(json)) return json.length ? extractNode(json[0]) : undefined
  if (typeof json === 'object') return extractNode(json)
  return undefined
}

export async function getExplain(sql: string, analyze: boolean): Promise<ExplainResult> {
  const trimmed = sql.trim()
  if (!trimmed) return { text: '' }

  // Build DuckDB-compatible EXPLAIN statements
  const explainSql = analyze ? `EXPLAIN ANALYZE ${trimmed}` : `EXPLAIN ${trimmed}`

  // 1) Text plan
  const textTable = await executeReadQuery(explainSql)
  const text = tableToPlanText(textTable as ArrowTable)

  // 2) JSON plan (best-effort, fallback if not supported)
  try {
    // Use PRAGMA to switch explain output to JSON on the same connection
    const [, jsonTable/*, _reset*/] = await executeReadQuerySequence([
      "PRAGMA explain_output='json'",
      explainSql,
      "PRAGMA explain_output='text'",
    ])
    const jsonStr = tableToPlanText(jsonTable as ArrowTable)
    let parsed: any
    try {
      parsed = JSON.parse(jsonStr)
    } catch {
      // Some builds may return one JSON object per row; try concatenation
      const lines = jsonStr
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean)
      const maybeJoined = lines.join('')
      parsed = JSON.parse(maybeJoined)
    }
    const root = findRoot(parsed)
    return { text, root }
  } catch (err) {
    // If PRAGMA or JSON not available, just return text
    return { text }
  }
}

export type IcicleData = {
  labels: string[]
  parents: string[]
  values: number[]
  hovertext: string[]
}

// Convert a plan tree to Plotly icicle-compatible arrays
export function toIcicle(root: PlanNode): IcicleData {
  const labels: string[] = []
  const parents: string[] = []
  const values: number[] = []
  const hovertext: string[] = []

  function visit(node: PlanNode, parentLabel: string | null) {
    const label = uniqueLabel(node, parentLabel)
    labels.push(label)
    parents.push(parentLabel ?? '')
    const val = typeof node.timingMs === 'number' ? node.timingMs : 1
    values.push(val)
    const hover = `${node.name}${node.timingMs != null ? `\nTime: ${node.timingMs.toFixed(2)} ms` : ''}${
      node.rows != null ? `\nRows: ${node.rows}` : ''
    }`
    hovertext.push(hover)
    for (const child of node.children || []) visit(child, label)
  }

  // Ensure uniqueness to avoid Plotly parent collisions
  const counts = new Map<string, number>()
  function uniqueLabel(node: PlanNode, parent: string | null) {
    const base = node.name
    const key = `${parent ?? 'root'}>${base}`
    const c = (counts.get(key) || 0) + 1
    counts.set(key, c)
    return c === 1 ? base : `${base} (${c})`
  }

  visit(root, null)
  return { labels, parents, values, hovertext }
}
