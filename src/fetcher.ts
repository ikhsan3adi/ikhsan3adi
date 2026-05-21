export interface GitHubStats {
  username: string
  totalStars: number
  totalCommits: number
  totalForks: number
  totalPRs: number
  fetchedAt: string
}

interface Repo {
  stargazers_count: number
  forks_count: number
}

interface SearchResult {
  total_count: number
}

async function paginate<T>(token: string, initialUrl: string): Promise<T[]> {
  const results: T[] = []
  let url: string | null = initialUrl

  while (url) {
    const res: Response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "github-stats-generator",
      },
    })

    if (res.status === 401) throw new Error("Invalid or missing GitHub token")
    if (res.status === 403 || res.status === 429) {
      const retryAfter: string = res.headers.get("Retry-After") || "unknown"
      throw new Error(`Rate limit hit — retry after ${retryAfter} seconds`)
    }
    if (!res.ok) throw new Error(`GitHub API error: ${res.status}`)

    const data: T[] = await res.json()
    results.push(...data)

    const linkHeader: string | null = res.headers.get("Link")
    url = null
    if (linkHeader) {
      const match: RegExpMatchArray | null = linkHeader.match(/<([^>]+)>;\s*rel="next"/)
      if (match) url = match[1]
    }
  }

  return results
}

async function fetchWithRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch {
    await new Promise(r => setTimeout(r, 3000))
    return await fn()
  }
}

export async function fetchStats(username: string, token: string): Promise<GitHubStats> {
  return fetchWithRetry(async () => {
    const reposUrl = `https://api.github.com/users/${username}/repos?per_page=100&type=all`
    const repos = await paginate<Repo>(token, reposUrl)
    const totalStars = repos.reduce((sum, r) => sum + r.stargazers_count, 0)
    const totalForks = repos.reduce((sum, r) => sum + r.forks_count, 0)

    const prUrl = `https://api.github.com/search/issues?q=author:${username}+type:pr`
    const prRes: Response = await fetch(prUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "github-stats-generator",
      },
    })
    if (prRes.status === 401) throw new Error("Invalid or missing GitHub token")
    if (!prRes.ok) throw new Error(`GitHub API error: ${prRes.status}`)
    const prData: SearchResult = await prRes.json()
    const totalPRs = prData.total_count

    // Use GitHub Search Commits API — counts ALL commits across all repos
    // (public + private with proper token scope) by the author.
    const commitRes: Response = await fetch(
      `https://api.github.com/search/commits?q=author:${username}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.cloak-preview",
          "User-Agent": "github-stats-generator",
        },
      },
    )
    if (commitRes.status === 401) throw new Error("Invalid or missing GitHub token")
    if (!commitRes.ok) throw new Error(`GitHub API error: ${commitRes.status}`)
    const commitData: SearchResult = await commitRes.json()
    const totalCommits = commitData.total_count

    const nowWIB = new Date().toLocaleString("en-ID", {
      timeZone: "UTC",
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

    return {
      username,
      totalStars,
      totalCommits,
      totalForks,
      totalPRs,
      fetchedAt: `${nowWIB} UTC`,
    }
  })
}
