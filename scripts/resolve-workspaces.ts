import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { execSync } from "node:child_process"

const pkg = JSON.parse(readFileSync("package.json", "utf8"))
const ws: string[] = pkg.workspaces?.packages || pkg.workspaces || []
const hasWorkspaces = Array.isArray(ws)

// remove external workspace entries if present
if (hasWorkspaces) {
  const ext = ws.filter((p) => p.startsWith(".."))
  if (ext.length > 0) {
    pkg.workspaces.packages = ws.filter((p) => !p.startsWith(".."))
    writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n")
  }
}

// collect local workspace package names
const localNames = new Set<string>()
if (hasWorkspaces) {
  for (const pattern of ws.filter((p) => !p.startsWith(".."))) {
    const base = pattern.replace(/\/\*$/, "")
    if (!existsSync(base)) {
      continue
    }
    for (const dir of readdirSync(base, { withFileTypes: true })) {
      if (!dir.isDirectory()) {
        continue
      }
      const p = join(base, dir.name, "package.json")
      if (existsSync(p)) {
        localNames.add(JSON.parse(readFileSync(p, "utf8")).name)
      }
    }
  }
}

// find all package.json files
const files = execSync(
  'find . -name package.json -not -path "*/node_modules/*"',
)
  .toString()
  .trim()
  .split("\n")

const resolved: string[] = []
for (const file of files) {
  const content = readFileSync(file, "utf8")
  let changed = content

  // replace workspace:* deps that aren't local
  const wsRe = /"([^"]+)": "workspace:\*"/g
  let m: RegExpExecArray | null
  while ((m = wsRe.exec(content)) !== null) {
    if (!localNames.has(m[1])) {
      changed = changed.replace(m[0], `"${m[1]}": "*"`)
      resolved.push(m[1])
    }
  }

  // replace ../path deps
  const pathRe = /"([^"]+)": "\.\.\/[^"]+"/g
  while ((m = pathRe.exec(content)) !== null) {
    changed = changed.replace(m[0], `"${m[1]}": "*"`)
    resolved.push(m[1])
  }

  if (changed !== content) {
    writeFileSync(file, changed)
  }
}

if (resolved.length) {
  console.log("Resolved external deps:", [...new Set(resolved)].join(", "))
}
