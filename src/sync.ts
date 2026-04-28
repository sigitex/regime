// oxlint-disable complexity
import { dirname, relative, join } from "node:path"
import { existsSync, mkdirSync } from "node:fs"
import { writeFile } from "node:fs/promises"
import {
  findRegimeConfigs,
  loadRegimeConfig,
  normalizeTemplates,
  resolveTemplateChain,
  getStrategy,
  interpolate,
  readFileSync,
  deepMerge,
  mergeTemplateJsonFiles,
  mergeTemplateJsoncFiles,
  mergeTemplateLineFiles,
  mergeLines,
  stringifyJsonc,
  parseJsonc,
  detectIndent,
} from "./shared"

const green = Bun.color("green", "ansi")
const red = Bun.color("red", "ansi")
const purple = Bun.color("purple", "ansi")
const reset = "\x1b[0m"

export async function sync(targetDir: string): Promise<void> {
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

    let allSynced = true

    for (const [relPath, templatePaths] of files) {
      const targetRelPath = interpolate(relPath, vars)
      const targetPath = join(rcDir, targetRelPath)
      const strategy = getStrategy(targetRelPath, patterns)

      // Ensure target directory exists
      const targetFileDir = dirname(targetPath)
      if (!existsSync(targetFileDir)) {
        mkdirSync(targetFileDir, { recursive: true })
      }

      if (strategy === "merge json") {
        let templateObj: unknown
        try {
          templateObj = mergeTemplateJsonFiles(
            templatePaths,
            vars,
            targetRelPath,
          )
        } catch (error) {
          console.log(
            `  ${targetRelPath}: ${red}failed to parse template JSON${reset} - ${error}`,
          )
          continue
        }

        if (existsSync(targetPath)) {
          const existingContent = readFileSync(targetPath)
          let existingObj: unknown
          try {
            existingObj = JSON.parse(existingContent)
          } catch (error) {
            console.log(
              `  ${targetRelPath}: ${red}failed to parse existing JSON${reset} - ${error}`,
            )
            continue
          }

          const merged = deepMerge(existingObj, templateObj)
          const indent = detectIndent(existingContent)
          const mergedContent = JSON.stringify(merged, null, indent) + "\n"

          if (mergedContent === existingContent) {
            // already in sync
            continue
          }

          await writeFile(targetPath, mergedContent)
          console.log(`  ${targetRelPath}: ${green}updated${reset}`)
          allSynced = false
        } else {
          const content = JSON.stringify(templateObj, null, "  ") + "\n"
          await writeFile(targetPath, content)
          console.log(`  ${targetRelPath}: ${green}created${reset}`)
          allSynced = false
        }
      } else if (strategy === "merge jsonc") {
        let templateObj: unknown
        try {
          templateObj = mergeTemplateJsoncFiles(
            templatePaths,
            vars,
            targetRelPath,
          )
        } catch (error) {
          console.log(
            `  ${targetRelPath}: ${red}failed to parse template JSONC${reset} - ${error}`,
          )
          continue
        }

        if (existsSync(targetPath)) {
          const existingContent = readFileSync(targetPath)
          let existingObj: unknown
          try {
            existingObj = parseJsonc(existingContent)
          } catch (error) {
            console.log(
              `  ${targetRelPath}: ${red}failed to parse existing JSONC${reset} - ${error}`,
            )
            continue
          }

          const merged = deepMerge(existingObj, templateObj)
          const indent = detectIndent(existingContent)
          const mergedContent = stringifyJsonc(merged, indent)

          if (mergedContent === existingContent) {
            // already in sync
            continue
          }

          await writeFile(targetPath, mergedContent)
          console.log(`  ${targetRelPath}: ${green}updated${reset}`)
          allSynced = false
        } else {
          const content = stringifyJsonc(templateObj, "\t")
          await writeFile(targetPath, content)
          console.log(`  ${targetRelPath}: ${green}created${reset}`)
          allSynced = false
        }
      } else if (strategy === "merge lines") {
        const templateContent = mergeTemplateLineFiles(
          templatePaths,
          vars,
          targetRelPath,
        )

        if (existsSync(targetPath)) {
          const existingContent = readFileSync(targetPath)
          const mergedContent = mergeLines(existingContent, templateContent)
          if (mergedContent === existingContent) {
            // already in sync
            continue
          }
          await writeFile(targetPath, mergedContent)
          console.log(`  ${targetRelPath}: ${green}updated${reset}`)
          allSynced = false
        } else {
          await writeFile(targetPath, templateContent)
          console.log(`  ${targetRelPath}: ${green}created${reset}`)
          allSynced = false
        }
      } else if (strategy === "overwrite") {
        const templateContent = interpolate(
          readFileSync(templatePaths[templatePaths.length - 1]),
          vars,
          targetRelPath,
        )

        if (existsSync(targetPath)) {
          const existingContent = readFileSync(targetPath)
          if (existingContent === templateContent) {
            // already in sync
            continue
          }
          await writeFile(targetPath, templateContent)
          console.log(`  ${targetRelPath}: ${green}updated${reset}`)
          allSynced = false
        } else {
          await writeFile(targetPath, templateContent)
          console.log(`  ${targetRelPath}: ${green}created${reset}`)
          allSynced = false
        }
      }
    }

    if (allSynced) {
      console.log(`  ${green}in sync${reset}`)
    }
  }
}
