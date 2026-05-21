import * as esbuild from "esbuild"
import { writeFileSync } from "fs"
import { resolve } from "path"
import puppeteer from "puppeteer"
import { CARD_HEIGHT, CARD_WIDTH, VIEWPORT_FALLBACK_HEIGHT } from "./constants"

let bundlePromise: Promise<string> | null = null

async function getDomToSvgBundle(): Promise<string> {
  if (!bundlePromise) {
    bundlePromise = (async () => {
      const result = await esbuild.build({
        entryPoints: [resolve("node_modules/dom-to-svg/lib/index.js")],
        bundle: true,
        format: "iife",
        globalName: "DomToSvg",
        write: false,
        minify: true,
        target: ["chrome110"],
      })
      return result.outputFiles[0].text
    })()
  }
  return bundlePromise
}

export async function exportToSVG(html: string, outputPath: string): Promise<void> {
  const browser = await puppeteer.launch({
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
    ],
    headless: true,
  })

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: CARD_WIDTH, height: CARD_HEIGHT ?? VIEWPORT_FALLBACK_HEIGHT })
    await page.setContent(html, { waitUntil: "networkidle0" })

    const bundle = await getDomToSvgBundle()
    await page.addScriptTag({ content: bundle })

    const svgContent = await page.evaluate(() => {
      const el = document.querySelector("body > div") as HTMLElement
      if (!el) return ""

      const svgNs = "http://www.w3.org/2000/svg"
      const doc = (window as any).DomToSvg.elementToSVG(el, {
        captureArea: el.getBoundingClientRect(),
      })

      // Extract @font-face rules from the page's style tag
      const styleTag = document.querySelector("style")
      const fontCss = styleTag
        ? (styleTag.textContent || "").match(/@font-face\s*\{[^}]+\}/g)?.join("\n") || ""
        : ""

      const svgStyle = doc.createElementNS(svgNs, "style")
      svgStyle.textContent = `${fontCss}`
      doc.documentElement.insertBefore(svgStyle, doc.documentElement.firstChild)

      return new XMLSerializer().serializeToString(doc)
    })

    writeFileSync(outputPath, svgContent, "utf-8")
  } finally {
    await browser.close()
  }
}
