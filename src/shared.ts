import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from "node:path"
import {
  existsSync,
  readFileSync as fsReadFileSync,
  readdirSync,
} from "node:fs"
import { readdir } from "node:fs/promises"
import { Glob } from "bun"
import { parse as parseJsonc } from "jsonc-parser"
export { parseJsonc }

// --- Types ---

export type RegimeConfig = {
  templates?: string | string[]
  vars?: Record<string, string>
  sources?: Record<string, string>
}

export type RegimeConfigEntry = {
  dir: string
  configPath?: string
  internalConfigPath?: string
}

export type TemplateConfig = {
  inherits?: string[]
  patterns?: Record<string, string>
  ignore?: string[]
}

type TemplateReference = {
  root: string
  path: string
}

export type CollectedTemplate = {
  files: Map<string, string[]> // relative path -> absolute paths (in chain order)
  patterns: Record<string, string>
}

// --- Constants ---

export const regimeConfigFile = "regime.config.json"
export const regimeInternalConfigFile = "regime.internal.json"

// --- Utilities ---

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) {
    return true
  }
  if (typeof a !== typeof b) {
    return false
  }
  if (a === null || b === null) {
    return a === b
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false
    }
    return a.every((item, i) => deepEqual(item, b[i]))
  }
  if (isRecord(a) && isRecord(b)) {
    const keysA = Object.keys(a)
    const keysB = Object.keys(b)
    if (keysA.length !== keysB.length) {
      return false
    }
    return keysA.every((k) => k in b && deepEqual(a[k], b[k]))
  }
  return false
}

export function readFileSync(path: string): string {
  return fsReadFileSync(path, "utf-8")
}

export function readdirSyncRecursive(dir: string, prefix = ""): string[] {
  const results: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) {
      results.push(...readdirSyncRecursive(join(dir, entry.name), rel))
    } else {
      results.push(rel)
    }
  }
  return results
}

// --- Template resolution ---

export function resolveTemplateChain(
  names: string[],
  configDir: string,
  sources: Record<string, string>,
): CollectedTemplate {
  const excluded = new Set(
    names
      .filter((name) => name.startsWith("!"))
      .map((name) => resolveTemplateReference(name.slice(1), configDir, sources))
      .filter((reference) => reference !== undefined)
      .map(templateReferenceId),
  )
  const included = names
    .filter((name) => !name.startsWith("!"))
    .map((name) => resolveTemplateReference(name, configDir, sources))
    .filter((reference) => reference !== undefined)
  const visited = new Set<string>()
  const files = new Map<string, string[]>()
  const patterns: Record<string, string> = {}

  function walk(reference: TemplateReference) {
    const id = templateReferenceId(reference)
    if (visited.has(id) || excluded.has(id)) {
      return
    }
    visited.add(id)

    const dir = join(reference.root, reference.path)
    if (!existsSync(dir)) {
      console.error(
        `  warning: template "${reference.path}" not found at ${dir}`,
      )
      return
    }

    const config = loadTemplateConfig(reference)

    // Walk parents first so children override
    if (config.inherits) {
      for (const parent of config.inherits) {
        const parentReference = createTemplateReference(reference.root, parent)
        if (!isWithinTemplateRoot(parentReference)) {
          console.error(
            `  warning: inherited template "${parent}" resolves outside template root ${reference.root}`,
          )
          continue
        }
        walk(parentReference)
      }
    }

    // Collect patterns
    if (config.patterns) {
      Object.assign(patterns, config.patterns)
    }

    // Collect files (skip .regime-template.json and ignored patterns)
    const ignoreGlobs = (config.ignore ?? []).map((p) => new Glob(p))
    const entries = readdirSyncRecursive(dir)
    for (const entry of entries) {
      if (entry === ".regime-template.json") {
        continue
      }
      if (ignoreGlobs.some((g) => g.match(entry))) {
        continue
      }
      const existing = files.get(entry) ?? []
      existing.push(join(dir, entry))
      files.set(entry, existing)
    }
  }

  for (const reference of included) {
    walk(reference)
  }

  return { files, patterns }
}

function loadTemplateConfig(reference: TemplateReference): TemplateConfig {
  const configPath = join(
    reference.root,
    reference.path,
    ".regime-template.json",
  )
  if (!existsSync(configPath)) {
    return {}
  }
  const raw = JSON.parse(readFileSync(configPath))
  return raw as TemplateConfig
}

function resolveTemplateReference(
  name: string,
  configDir: string,
  sources: Record<string, string>,
): TemplateReference | undefined {
  if (isAbsolute(name)) {
    const path = resolve(name)
    return createTemplateReference(dirname(path), basename(path))
  }

  const separator = name.indexOf(":")
  if (separator !== -1) {
    const sourceName = name.slice(0, separator)
    const root = sources[sourceName]
    if (!root) {
      console.error(
        `  warning: unknown template source "${sourceName}" in "${name}"`,
      )
      return undefined
    }
    const reference = createTemplateReference(
      root,
      name.slice(separator + 1),
    )
    if (!isWithinTemplateRoot(reference)) {
      console.error(
        `  warning: template "${name}" resolves outside source "${sourceName}"`,
      )
      return undefined
    }
    return reference
  }

  return createTemplateReference(configDir, name)
}

function createTemplateReference(
  root: string,
  templatePath: string,
): TemplateReference {
  const absoluteRoot = resolve(root)
  const absolutePath = resolve(absoluteRoot, templatePath)
  return {
    root: absoluteRoot,
    path: relative(absoluteRoot, absolutePath) || ".",
  }
}

function templateReferenceId(reference: TemplateReference): string {
  return `${reference.root}\0${reference.path}`
}

function isWithinTemplateRoot(reference: TemplateReference): boolean {
  return (
    !isAbsolute(reference.path) &&
    reference.path !== ".." &&
    !reference.path.startsWith(`..${sep}`)
  )
}

// --- Strategy matching ---

export function getStrategy(
  filePath: string,
  patterns: Record<string, string>,
): string {
  // Check exact match first
  if (patterns[filePath]) {
    return patterns[filePath]
  }

  // Check glob patterns
  for (const [pattern, strategy] of Object.entries(patterns)) {
    if (pattern.includes("*")) {
      const glob = new Glob(pattern)
      if (glob.match(filePath)) {
        return strategy
      }
    }
  }

  return "overwrite" // default
}

// --- Variable interpolation ---

export function interpolate(
  content: string,
  vars: Record<string, string>,
  context?: string,
): string {
  return content.replace(/<<(\w+)>>/g, (_, key) => {
    if (!(key in vars)) {
      console.error(
        `  warning: undeclared var "<<${key}>>"${context ? ` in ${context}` : ""}`,
      )
    }
    return vars[key] ?? `<<${key}>>`
  })
}

// --- Deep merge (template values win; existing-only fields preserved) ---

export function deepMerge(base: unknown, overlay: unknown): unknown {
  if (Array.isArray(overlay) && Array.isArray(base)) {
    const result = [...overlay]
    for (const item of base) {
      if (!result.some((o) => deepEqual(o, item))) {
        result.push(item)
      }
    }
    return result
  }

  if (!isRecord(base)) {
    return overlay
  }
  if (!isRecord(overlay)) {
    return overlay
  }

  const result = { ...base }
  for (const key of Object.keys(overlay)) {
    if (key in result) {
      result[key] = deepMerge(result[key], overlay[key])
    } else {
      result[key] = overlay[key]
    }
  }
  return result
}

// --- Regime config loading ---

export function normalizeTemplates(
  templates: string | string[] | undefined,
): string[] {
  if (!templates) {
    return []
  }
  return Array.isArray(templates) ? templates : [templates]
}

export function mergeRegimeConfigs(
  base: RegimeConfig,
  internal: RegimeConfig,
): RegimeConfig {
  const merged = deepMerge(base, internal) as RegimeConfig
  const templates = [
    ...normalizeTemplates(base.templates),
    ...normalizeTemplates(internal.templates),
  ]

  if (templates.length > 0) {
    merged.templates = templates
  } else {
    delete merged.templates
  }

  return merged
}

export function loadRegimeConfig(entry: RegimeConfigEntry): RegimeConfig {
  const targetDir = resolve(entry.dir)
  const targetEntry = { ...entry, dir: targetDir }
  const target = loadLocalRegimeConfig(targetEntry)
  const vars: Record<string, string> = {}
  const sources: Record<string, string> = {}

  for (const dir of ancestorDirs(targetDir)) {
    const currentEntry =
      dir === targetDir ? targetEntry : findRegimeConfigEntry(dir)
    if (!currentEntry) {
      continue
    }

    const config = loadLocalRegimeConfig(currentEntry)
    Object.assign(vars, config.vars)
    Object.assign(sources, config.sources)
  }

  const config = { ...target }
  if (Object.keys(vars).length > 0) {
    config.vars = vars
  }
  if (Object.keys(sources).length > 0) {
    config.sources = sources
  }

  return config
}

function loadLocalRegimeConfig(entry: RegimeConfigEntry): RegimeConfig {
  const base = entry.configPath
    ? (JSON.parse(readFileSync(entry.configPath)) as RegimeConfig)
    : {}
  const internal = entry.internalConfigPath
    ? (JSON.parse(readFileSync(entry.internalConfigPath)) as RegimeConfig)
    : {}

  const config = mergeRegimeConfigs(base, internal)
  if (config.sources) {
    config.sources = Object.fromEntries(
      Object.entries(config.sources).map(([name, path]) => [
        name,
        resolve(entry.dir, path),
      ]),
    )
  }

  return config
}

function ancestorDirs(targetDir: string): string[] {
  const dirs: string[] = []
  let dir = targetDir

  while (true) {
    dirs.unshift(dir)
    const parent = dirname(dir)
    if (parent === dir) {
      return dirs
    }
    dir = parent
  }
}

function findRegimeConfigEntry(dir: string): RegimeConfigEntry | undefined {
  const configPath = join(dir, regimeConfigFile)
  const internalConfigPath = join(dir, regimeInternalConfigFile)
  const hasConfig = existsSync(configPath)
  const hasInternalConfig = existsSync(internalConfigPath)

  if (!hasConfig && !hasInternalConfig) {
    return undefined
  }

  return {
    dir,
    configPath: hasConfig ? configPath : undefined,
    internalConfigPath: hasInternalConfig ? internalConfigPath : undefined,
  }
}

// --- Merge all template JSON files into one combined object ---

export function mergeTemplateJsonFiles(
  paths: string[],
  vars: Record<string, string>,
  relPath: string,
): unknown {
  let merged: unknown = {}
  for (const p of paths) {
    const content = interpolate(readFileSync(p), vars, relPath)
    merged = deepMerge(merged, JSON.parse(content))
  }
  return merged
}

// --- Merge all template JSONC files into one combined object ---

export function mergeTemplateJsoncFiles(
  paths: string[],
  vars: Record<string, string>,
  relPath: string,
): unknown {
  let merged: unknown = {}
  for (const p of paths) {
    const content = interpolate(readFileSync(p), vars, relPath)
    merged = deepMerge(merged, parseJsonc(content))
  }
  return merged
}

// --- Merge line-oriented template files ---

function contentLines(content: string): string[] {
  const lines = content.replaceAll("\r\n", "\n").split("\n")
  if (lines.at(-1) === "") {
    lines.pop()
  }
  return lines
}

export function missingLines(
  existingContent: string,
  templateContent: string,
): string[] {
  const existing = new Set(contentLines(existingContent))
  const missing: string[] = []

  for (const line of contentLines(templateContent)) {
    if (!existing.has(line)) {
      existing.add(line)
      missing.push(line)
    }
  }

  return missing
}

export function mergeLines(
  existingContent: string,
  templateContent: string,
): string {
  const missing = missingLines(existingContent, templateContent)
  if (missing.length === 0) {
    return existingContent
  }

  const base =
    existingContent.length === 0 || existingContent.endsWith("\n")
      ? existingContent
      : `${existingContent}\n`
  return `${base}${missing.join("\n")}\n`
}

export function mergeTemplateLineFiles(
  paths: string[],
  vars: Record<string, string>,
  relPath: string,
): string {
  let merged = ""
  for (const p of paths) {
    const content = interpolate(readFileSync(p), vars, relPath)
    merged = mergeLines(merged, content)
  }
  return merged
}

// --- JSONC stringify (JSON with trailing commas) ---

export function stringifyJsonc(obj: unknown, indent: string): string {
  return jsonWithTrailingCommas(obj, indent, 0) + "\n"
}

function jsonWithTrailingCommas(
  value: unknown,
  indent: string,
  depth: number,
): string {
  if (value === null) {
    return "null"
  }
  if (typeof value === "boolean" || typeof value === "number") {
    return JSON.stringify(value)
  }
  if (typeof value === "string") {
    return JSON.stringify(value)
  }

  const currentIndent = indent.repeat(depth + 1)
  const closingIndent = indent.repeat(depth)

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "[]"
    }
    const items = value.map(
      (item) =>
        `${currentIndent}${jsonWithTrailingCommas(item, indent, depth + 1)},`,
    )
    return `[\n${items.join("\n")}\n${closingIndent}]`
  }

  if (isRecord(value)) {
    const keys = Object.keys(value)
    if (keys.length === 0) {
      return "{}"
    }
    const entries = keys.map(
      (key) =>
        `${currentIndent}${JSON.stringify(key)}: ${jsonWithTrailingCommas(value[key], indent, depth + 1)},`,
    )
    return `{\n${entries.join("\n")}\n${closingIndent}}`
  }

  return String(value)
}

// --- Indentation detection ---

export function detectIndent(content: string): string {
  const match = content.match(/^(\s+)/m)
  return match?.[1] ?? "  "
}

// --- Diff reporting ---

export type DiffEntry = {
  field: string
  expected: unknown
  actual: unknown
  ok: boolean
}

export function diffJson(
  templateObj: unknown,
  existingObj: unknown,
  full = false,
  path: string[] = [],
): DiffEntry[] {
  const results: DiffEntry[] = []

  if (!isRecord(templateObj)) {
    return results
  }

  const existingRecord = isRecord(existingObj) ? existingObj : {}

  for (const key of Object.keys(templateObj)) {
    const fieldPath = [...path, key].join(".")
    const expected = templateObj[key]
    const actual = existingRecord[key]

    if (actual === undefined) {
      results.push({ field: fieldPath, expected, actual: undefined, ok: false })
    } else if (isRecord(expected) && isRecord(actual)) {
      results.push(...diffJson(expected, actual, full, [...path, key]))
    } else if (Array.isArray(expected) && Array.isArray(actual)) {
      const missing = expected.filter(
        (e) => !actual.some((a) => deepEqual(a, e)),
      )
      if (missing.length > 0) {
        results.push({ field: fieldPath, expected, actual, ok: false })
      } else if (full) {
        results.push({ field: fieldPath, expected, actual, ok: true })
      }
    } else if (JSON.stringify(expected) !== JSON.stringify(actual)) {
      results.push({ field: fieldPath, expected, actual, ok: false })
    } else if (full) {
      results.push({ field: fieldPath, expected, actual, ok: true })
    }
  }

  return results
}

// --- Find all regime config entries in a repo ---

export async function findRegimeConfigs(
  repoDir: string,
): Promise<RegimeConfigEntry[]> {
  const results: RegimeConfigEntry[] = []

  async function walk(dir: string) {
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      return
    }
    const entryNames = new Set(entries.map((entry) => entry.name))
    const configPath = entryNames.has(regimeConfigFile)
      ? join(dir, regimeConfigFile)
      : undefined
    const internalConfigPath = entryNames.has(regimeInternalConfigFile)
      ? join(dir, regimeInternalConfigFile)
      : undefined

    if (configPath || internalConfigPath) {
      results.push({ dir, configPath, internalConfigPath })
    }

    for (const entry of entries) {
      if (entry.name === "node_modules" || entry.name === ".git") {
        continue
      }
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        await walk(full)
      }
    }
  }

  await walk(repoDir)
  return results
}
