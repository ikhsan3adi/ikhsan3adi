import { fetchStats } from "./src/fetcher"
import { renderTemplate } from "./src/renderer"
import { exportToSVG } from "./src/exporter"
import { mkdirSync } from "fs"

async function main() {
  const username = process.env.GITHUB_USERNAME
  const token = process.env.GITHUB_TOKEN

  if (!username || !token) {
    console.error("Missing GITHUB_USERNAME or GITHUB_TOKEN")
    process.exit(1)
  }

  mkdirSync("./profiles", { recursive: true })

  console.log(`Fetching stats for ${username}...`)
  const stats = await fetchStats(username, token)
  console.log("Stats:", stats)

  console.log("Rendering light mode...")
  const lightHtml = renderTemplate(stats, false)
  await exportToSVG(lightHtml, "./profiles/simple-stats.svg")

  console.log("Rendering dark mode...")
  const darkHtml = renderTemplate(stats, true)
  await exportToSVG(darkHtml, "./profiles/simple-stats-dark.svg")

  console.log("Done. SVGs saved to ./profiles/")
}

main().catch((err) => {
  console.error("Fatal error:", err)
  process.exit(1)
})
