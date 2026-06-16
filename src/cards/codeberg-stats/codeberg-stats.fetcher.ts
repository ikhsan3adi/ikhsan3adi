import type { HttpService } from '../../core/http-service'

interface CodebergRepo {
  name: string
  full_name: string
  owner: { login: string }
  stars_count: number
  forks_count: number
}

export interface CodebergStatsData {
  username: string
  totalStars: number
  totalCommits: number
  totalForks: number
  totalPRs: number
  fetchedAt: string
}

export class CodebergStatsFetcher {
  private base = 'https://codeberg.org/api/v1'

  constructor(
    private http: HttpService,
    private username: string
  ) {}

  async fetch(): Promise<CodebergStatsData> {
    const repos = await this.http.paginate<CodebergRepo>(
      `${this.base}/users/${this.username}/repos?limit=50`
    )

    const totalStars = repos.reduce((sum, r) => sum + r.stars_count, 0)
    const totalForks = repos.reduce((sum, r) => sum + r.forks_count, 0)

    const counts = await Promise.all(
      repos.map((repo) =>
        Promise.all([
          this.http.countFromHeader(
            `${this.base}/repos/${repo.owner.login}/${repo.name}/pulls?state=all&limit=1`
          ),
          this.http.countFromHeader(
            `${this.base}/repos/${repo.owner.login}/${repo.name}/commits?author=${this.username}&limit=1`
          )
        ])
      )
    )

    const totalPRs = counts.reduce((sum, [prs]) => sum + prs, 0)
    const totalCommits = counts.reduce((sum, [, commits]) => sum + commits, 0)

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
      totalCommits,
      totalForks,
      totalPRs,
      fetchedAt: `${nowWIB} UTC`
    }
  }
}
