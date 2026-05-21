import { readFileSync } from "fs"
import Handlebars from "handlebars"
import { resolve } from "path"
import { CARD_HEIGHT, CARD_WIDTH } from "./constants"
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
      const data = readFileSync(full).toString("base64")
      return `url(data:font/woff2;base64,${data})`
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
    "latin-500.css",
    "latin-700.css",
  ])

  const cascadiaMono = loadCSS("@fontsource/cascadia-mono", [
    "latin-700.css",
  ])

  /// animation doesn't work in dom-to-svg
  const animationCss = `
@-webkit-keyframes scale-up-center {
  0% {
    -webkit-transform: scale(0);
    transform: scale(0);
  }
  100% {
    -webkit-transform: scale(1);
    transform: scale(1);
  }
}

@keyframes scale-up-center {
  0% {
    -webkit-transform: scale(0);
    transform: scale(0);
  }
  100% {
    -webkit-transform: scale(1);
    transform: scale(1);
  }
}`

  const allCss = [tailwind, spaceGrotesk, cascadiaMono, animationCss].join("\n")
  const hydrated = templateSrc.replace("{{INLINE_CSS}}", allCss)
  const template = Handlebars.compile(hydrated)

  const icons = {
    star: loadIcon("star"),
    commit: loadIcon("code-commit"),
    fork: loadIcon("code-fork"),
    pr: loadIcon("code-pull-request"),
  }

  return template({ ...stats, dark, icons, cardWidth: CARD_WIDTH, cardHeight: CARD_HEIGHT })
}
