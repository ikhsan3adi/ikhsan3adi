import { readFileSync } from "fs"
import Handlebars from "handlebars"
import { resolve } from "path"
import type { GitHubStats } from "./fetcher"

interface IconData {
  viewBox: string
  path: string
}

function inlineAssets(css: string, baseDir: string): string {
  return css.replace(/url\(([^)]+)\)/g, (_match: string, urlPath: string) => {
    const p = urlPath.replace(/['"]/g, "")
    const full = resolve(baseDir, p)
    try {
      const ext = p.split(".").pop() || ""
      const mime: Record<string, string> = {
        woff2: "font/woff2",
        woff: "font/woff",
        ttf: "font/ttf",
        otf: "font/otf",
        eot: "application/vnd.ms-fontobject",
        svg: "image/svg+xml",
        png: "image/png",
      }
      const data = readFileSync(full).toString("base64")
      return `url(data:${mime[ext] || "application/octet-stream"};base64,${data})`
    } catch {
      return _match
    }
  })
}

function loadCSS(pkg: string, files: string[]): string {
  const base = resolve("node_modules", pkg)
  return files.map(f => inlineAssets(readFileSync(resolve(base, f), "utf-8"), base)).join("\n")
}

function loadIcon(name: string): IconData {
  const svg = readFileSync(
    resolve(`node_modules/@fortawesome/fontawesome-free/svgs/solid/${name}.svg`),
    "utf-8",
  )
  const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1] || "0 0 512 512"
  const path = svg.match(/d="([^"]+)"/)?.[1] || ""
  return { viewBox, path }
}

export function renderTemplate(stats: GitHubStats, dark: boolean): string {
  const templateSrc = readFileSync(resolve("templates/simple-stats.html"), "utf-8")
  const tailwind = readFileSync(resolve("src/output.css"), "utf-8")

  const spaceGrotesk = loadCSS("@fontsource/space-grotesk", [
    "latin-400.css",
    "latin-500.css",
    "latin-600.css",
    "latin-700.css",
  ])

  const cascadiaMono = loadCSS("@fontsource/cascadia-mono", [
    "latin-400.css",
    "latin-500.css",
    "latin-600.css",
    "latin-700.css",
  ])

  const allCss = [tailwind, spaceGrotesk, cascadiaMono].join("\n")
  const hydrated = templateSrc.replace("{{INLINE_CSS}}", allCss)
  const template = Handlebars.compile(hydrated)

  const icons = {
    star: loadIcon("star"),
    commit: loadIcon("code-commit"),
    fork: loadIcon("code-fork"),
    pr: loadIcon("code-pull-request"),
  }

  return template({ ...stats, dark, icons })
}
