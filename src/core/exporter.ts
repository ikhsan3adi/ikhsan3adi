import * as esbuild from 'esbuild'
import { writeFileSync } from 'fs'
import { resolve } from 'path'
import puppeteer from 'puppeteer'

const DEFAULT_WIDTH = 640
const DEFAULT_HEIGHT = 800

let bundlePromise: Promise<string> | null = null

async function getDomToSvgBundle(): Promise<string> {
  if (!bundlePromise) {
    bundlePromise = (async () => {
      const result = await esbuild.build({
        entryPoints: [resolve('node_modules/dom-to-svg/lib/index.js')],
        bundle: true,
        format: 'iife',
        globalName: 'DomToSvg',
        write: false,
        minify: true,
        target: ['chrome110']
      })
      return result.outputFiles[0].text
    })()
  }
  return bundlePromise
}

function minifySvg(svg: string): string {
  let s = svg
  s = s.replace(/^<\?xml[^>]*\?>/, '')
  const parts = s.split(/(<style>[\s\S]*?<\/style>)/)
  for (let i = 0; i < parts.length; i++) {
    if (!parts[i].startsWith('<style>')) {
      parts[i] = parts[i]
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/>\s+</g, '><')
        .replace(/\s{2,}/g, ' ')
        .replace(/\s+\/>/g, '/>')
        .trim()
    }
  }
  return parts.join('')
}

export async function exportToSVG(
  html: string,
  outputPath: string,
  options?: { width?: number; height?: number }
): Promise<void> {
  const browser = await puppeteer.launch({
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--font-render-hinting=none'
    ],
    headless: true
  })

  try {
    const page = await browser.newPage()
    await page.setViewport({
      width: options?.width ?? DEFAULT_WIDTH,
      height: options?.height ?? DEFAULT_HEIGHT
    })
    await page.setContent(html, { waitUntil: 'networkidle0' })

    const bundle = await getDomToSvgBundle()
    await page.addScriptTag({ content: bundle })

    const svgContent = await page.evaluate(() => {
      const el = document.querySelector('body > div') as HTMLElement
      if (!el) return ''

      const svgNs = 'http://www.w3.org/2000/svg'
      const doc = (window as any).DomToSvg.elementToSVG(el, {
        captureArea: el.getBoundingClientRect()
      })

      const styleTag = document.querySelector('style')
      const allCss = styleTag ? styleTag.textContent || '' : ''

      const svgStyle = doc.createElementNS(svgNs, 'style')
      svgStyle.textContent = allCss
      doc.documentElement.insertBefore(svgStyle, doc.documentElement.firstChild)

      return new XMLSerializer().serializeToString(doc)
    })

    writeFileSync(outputPath, minifySvg(svgContent), 'utf-8')
  } finally {
    await browser.close()
  }
}
