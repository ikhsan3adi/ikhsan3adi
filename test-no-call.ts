import { mkdirSync, writeFileSync } from "fs"
import { exportToSVG } from "./src/exporter"
import type { GitHubStats } from "./src/fetcher"
import { renderTemplate } from "./src/renderer"

const mockStats: GitHubStats = {
  username: "ikhsan3adi",
  totalStars: 935,
  totalCommits: 13650,
  totalForks: 295,
  totalPRs: 208,
  fetchedAt: "21 May 2026 at 09.21 WIB",
}

async function main() {
  mkdirSync("./profiles", { recursive: true })

  console.log("Rendering light mode...")
  const lightHtml = renderTemplate(mockStats, false)
  writeFileSync("./profiles/simple-stats.html", lightHtml, "utf-8")
  await exportToSVG(lightHtml, "./profiles/simple-stats.svg")

  console.log("Rendering dark mode...")
  const darkHtml = renderTemplate(mockStats, true)
  writeFileSync("./profiles/simple-stats-dark.html", darkHtml, "utf-8")
  await exportToSVG(darkHtml, "./profiles/simple-stats-dark.svg")

  console.log("Done. SVGs saved to ./profiles/")
}

main().catch((err) => {
  console.error("Fatal error:", err)
  process.exit(1)
})
