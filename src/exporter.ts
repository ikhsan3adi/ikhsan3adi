import puppeteer from "puppeteer"
import { writeFileSync } from "fs"
import { resolve } from "path"
import * as esbuild from "esbuild"

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
    await page.setViewport({ width: 530, height: 245 })
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
      svgStyle.textContent = `
${fontCss}
@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
rect { animation: fadeSlideIn 0.4s ease-out both; }
text { animation: fadeSlideIn 0.4s ease-out both; }
text:nth-of-type(1) { animation-delay: 0.05s; }
text:nth-of-type(2) { animation-delay: 0.10s; }
text:nth-of-type(3) { animation-delay: 0.15s; }
text:nth-of-type(4) { animation-delay: 0.20s; }
text:nth-of-type(5) { animation-delay: 0.25s; }
text:nth-of-type(6) { animation-delay: 0.30s; }
text:nth-of-type(7) { animation-delay: 0.35s; }
text:nth-of-type(8) { animation-delay: 0.40s; }
text:nth-of-type(9) { animation-delay: 0.45s; }
text:nth-of-type(10) { animation-delay: 0.50s; }
`
      doc.documentElement.insertBefore(svgStyle, doc.documentElement.firstChild)

      return new XMLSerializer().serializeToString(doc)
    })

    writeFileSync(outputPath, svgContent, "utf-8")
  } finally {
    await browser.close()
  }
}
