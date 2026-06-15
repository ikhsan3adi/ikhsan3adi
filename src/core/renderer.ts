import Handlebars from 'handlebars'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import postcss from 'postcss'
import tailwindcss from 'tailwindcss'
import resolveConfig from 'tailwindcss/resolveConfig'
import cssnano from 'cssnano'
import type { IconData, FontSpec } from './types'
import type { ICard } from '../cards/card.interface'
import { createRequire } from 'module'

const CSS_MARKER = '<!-- INLINE_CSS -->'
const require = createRequire(import.meta.url)
const tailwindUserConfig = require(process.cwd() + '/tailwind.config.js')
const TAILWIND_BASE_CONFIG = resolveConfig(tailwindUserConfig)

function inlineAssets(css: string, baseDir: string): string {
  return css.replace(/url\(([^)]+)\)/g, (_match: string, urlPath: string) => {
    const p = urlPath.replace(/['"]/g, '')
    const full = resolve(baseDir, p)
    try {
      const data = readFileSync(full).toString('base64')
      return `url(data:font/woff2;base64,${data})`
    } catch {
      return _match
    }
  })
}

const fontCache = new Map<string, string>()
const iconCache = new Map<string, IconData>()
const cssCache = new Map<string, string>()

async function cssnanoMinify(css: string): Promise<string> {
  const result = await postcss([cssnano()]).process(css, { from: undefined })
  return result.css
}

export class Renderer {
  loadFontCSS(pkg: string, files: string[]): string {
    const key = `${pkg}/${files.join(',')}`
    if (fontCache.has(key)) return fontCache.get(key)!
    const base = resolve('node_modules', pkg)
    const css = files
      .map((f) => inlineAssets(readFileSync(resolve(base, f), 'utf-8'), base))
      .join('\n')
    fontCache.set(key, css)
    return css
  }

  loadIcon(name: string): IconData {
    if (iconCache.has(name)) return iconCache.get(name)!
    const svg = readFileSync(
      resolve(
        `node_modules/@fortawesome/fontawesome-free/svgs/solid/${name}.svg`
      ),
      'utf-8'
    )
    const data: IconData = {
      viewBox: svg.match(/viewBox="([^"]+)"/)?.[1] || '0 0 512 512',
      path: svg.match(/d="([^"]+)"/)?.[1] || ''
    }
    iconCache.set(name, data)
    return data
  }

  private async buildTailwindCSS(
    tailwindInput: string,
    htmlContent: string
  ): Promise<string> {
    const cacheKey = `${tailwindInput.length}:${htmlContent}`
    if (cssCache.has(cacheKey)) return cssCache.get(cacheKey)!

    const config = {
      ...TAILWIND_BASE_CONFIG,
      content: [{ raw: htmlContent, extension: 'html' }]
    }

    const lazyResult = postcss([tailwindcss(config), cssnano()]).process(
      tailwindInput,
      { from: undefined }
    )

    const result = await lazyResult

    cssCache.set(cacheKey, result.css)
    return result.css
  }

  async renderCard(
    card: ICard,
    data: Record<string, unknown>,
    options?: { dark?: boolean }
  ): Promise<string> {
    const template = card.getTemplate()
    const assets = card.getAssets()
    const config = card.getConfig()

    const icons: Record<string, IconData> = {}
    if (assets.iconNames) {
      if (Array.isArray(assets.iconNames)) {
        for (const name of assets.iconNames) {
          icons[name] = this.loadIcon(name)
        }
      } else {
        for (const [alias, name] of Object.entries(assets.iconNames)) {
          icons[alias] = this.loadIcon(name)
        }
      }
    }

    const renderData = {
      ...data,
      ...config,
      dark: options?.dark ?? false,
      icons
    }

    const compiledHtml = Handlebars.compile(template)(renderData)

    const tailwindCss = await this.buildTailwindCSS(
      assets.tailwindInput,
      compiledHtml
    )

    const fontsCss = (assets.fonts || [])
      .map((f: FontSpec) => this.loadFontCSS(f.pkg, f.files))
      .join('\n')

    const allCss = [tailwindCss, fontsCss, assets.extraCss || '']
      .filter(Boolean)
      .join('\n')

    const minified = await cssnanoMinify(allCss)

    return compiledHtml.replace(CSS_MARKER, minified)
  }
}
