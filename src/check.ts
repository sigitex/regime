// oxlint-disable complexity
import { relative, join } from "node:path"
import { existsSync } from "node:fs"
import {
  findRegimeConfigs,
  loadRegimeConfig,
  normalizeTemplates,
  resolveTemplateChain,
  getStrategy,
  interpolate,
  readFileSync,
  diffJson,
  mergeTemplateJsonFiles,
  mergeTemplateJsoncFiles,
  mergeTemplateLineFiles,
  missingLines,
  parseJsonc,
} from "./shared"

const red = Bun.color("red", "ansi")
const orange = Bun.color("orange", "ansi")
const green = Bun.color("green", "ansi")
const purple = Bun.color("purple", "ansi")
const reset = "\x1b[0m"

export async function check(targetDir: string, full = false): Promise<void> {
  const rcFiles = await findRegimeConfigs(targetDir)

  if (rcFiles.length === 0) {
    console.log("No regime config files found.")
    return
  }

  for (const entry of rcFiles) {
    const rcDir = entry.dir
    const relDir = relative(targetDir, rcDir) || "."
    console.log(`\n${purple}${relDir}/${reset}`)

    const rc = loadRegimeConfig(entry)
    const templateNames = normalizeTemplates(rc.templates)
    const vars = rc.vars ?? {}

    const { files, patterns } = resolveTemplateChain(
      templateNames,
      rcDir,
      rc.sources ?? {},
    )

    if (files.size === 0) {
      console.log("  (no template files)")
      continue
    }

    let synced = true

    for (const [relPath, templatePaths] of files) {
      const targetRelPath = interpolate(relPath, vars)
      const targetPath = join(rcDir, targetRelPath)
      const strategy = getStrategy(targetRelPath, patterns)

      if (!existsSync(targetPath)) {
        console.log(`  ${targetRelPath}: ${red}missing${reset}`)
        synced = false
        continue
      }

      if (strategy === "scaffold") {
        if (full) {
          console.log(`  ${targetRelPath}: ${green}ok${reset}`)
        }
        continue
      }

      const existingContent = readFileSync(targetPath)

      if (strategy === "merge json") {
        try {
          const templateObj = mergeTemplateJsonFiles(
            templatePaths,
            vars,
            targetRelPath,
          )
          const existingObj = JSON.parse(existingContent)
          const entries = diffJson(templateObj, existingObj, full)
          const diffs = entries.filter((e) => !e.ok)

          if (diffs.length > 0 || (full && entries.length > 0)) {
            if (diffs.length > 0) {
              synced = false
            }
            console.log(`  ${targetRelPath}:`)
            for (const d of entries) {
              if (d.ok) {
                console.log(`    ${d.field}: ${green}ok${reset}`)
              } else {
                const exp = JSON.stringify(d.expected)
                const act =
                  d.actual === undefined
                    ? `${red}missing${reset}`
                    : `${orange}${JSON.stringify(d.actual)}${reset}`
                console.log(`    ${d.field}: ${act} -> ${green}${exp}${reset}`)
              }
            }
          } else if (full) {
            console.log(`  ${targetRelPath}: ${green}ok${reset}`)
          }
        } catch (error) {
          console.log(
            `  ${targetRelPath}: ${red}failed to parse JSON${reset} - ${error}`,
          )
          synced = false
        }
      } else if (strategy === "merge jsonc") {
        try {
          const templateObj = mergeTemplateJsoncFiles(
            templatePaths,
            vars,
            targetRelPath,
          )
          const existingObj = parseJsonc(existingContent)
          const entries = diffJson(templateObj, existingObj, full)
          const diffs = entries.filter((e) => !e.ok)

          if (diffs.length > 0 || (full && entries.length > 0)) {
            if (diffs.length > 0) {
              synced = false
            }
            console.log(`  ${targetRelPath}:`)
            for (const d of entries) {
              if (d.ok) {
                console.log(`    ${d.field}: ${green}ok${reset}`)
              } else {
                const exp = JSON.stringify(d.expected)
                const act =
                  d.actual === undefined
                    ? `${red}missing${reset}`
                    : `${orange}${JSON.stringify(d.actual)}${reset}`
                console.log(`    ${d.field}: ${act} -> ${green}${exp}${reset}`)
              }
            }
          } else if (full) {
            console.log(`  ${targetRelPath}: ${green}ok${reset}`)
          }
        } catch (error) {
          console.log(
            `  ${targetRelPath}: ${red}failed to parse JSONC${reset} - ${error}`,
          )
          synced = false
        }
      } else if (strategy === "merge lines") {
        const templateContent = mergeTemplateLineFiles(
          templatePaths,
          vars,
          targetRelPath,
        )
        const missing = missingLines(existingContent, templateContent)
        if (missing.length > 0) {
          console.log(`  ${targetRelPath}:`)
          for (const line of missing) {
            console.log(
              `    line: ${red}missing${reset} -> ${green}${JSON.stringify(line)}${reset}`,
            )
          }
          synced = false
        } else if (full) {
          console.log(`  ${targetRelPath}: ${green}ok${reset}`)
        }
      } else if (strategy === "overwrite") {
        const templateContent = interpolate(
          readFileSync(templatePaths[templatePaths.length - 1]),
          vars,
          targetRelPath,
        )
        if (existingContent !== templateContent) {
          console.log(`  ${targetRelPath}: ${orange}differs${reset}`)
          synced = false
        } else if (full) {
          console.log(`  ${targetRelPath}: ${green}ok${reset}`)
        }
      }
    }

    if (synced) {
      console.log(`  ${green}in sync${reset}`)
    }
  }
}
