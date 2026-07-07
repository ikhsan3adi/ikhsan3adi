import type { HttpService } from '../../core/http-service'

interface Repo {
  stargazers_count: number
  forks_count: number
}

interface SearchResult {
  total_count: number
}

interface GitHubStatsData {
  username: string
  totalStars: number
  totalCommits: number
  totalForks: number
  totalPRs: number
  fetchedAt: string
}

export class GitHubStatsFetcher {
  constructor(
    private http: HttpService,
    private username: string
  ) {}

  async fetch(): Promise<GitHubStatsData> {
    const repos = await this.http.paginate<Repo>(
      `https://api.github.com/users/${this.username}/repos?per_page=100&type=all`
    )

    const totalStars = repos.reduce((sum, r) => sum + r.stargazers_count, 0)
    const totalForks = repos.reduce((sum, r) => sum + r.forks_count, 0)

    const prData = await this.http.get<SearchResult>(
      `https://api.github.com/search/issues?q=author:${this.username}+type:pr`,
      'application/vnd.github.v3+json'
    )

    const commitData = await this.http.get<SearchResult>(
      `https://api.github.com/search/commits?q=author:${this.username}`,
      'application/vnd.github.cloak-preview'
    )

    const nowWIB = new Date().toLocaleString('en-ID', {
      timeZone: 'UTC',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

    return {
      username: this.username,
      totalStars,
      totalCommits: commitData.total_count,
      totalForks,
      totalPRs: prData.total_count,
      fetchedAt: `${nowWIB} UTC`
    }
  }
}
