import type { HttpService } from '../../core/http-service'

interface GitLabProject {
  id: number
  path_with_namespace: string
  star_count: number
  forks_count: number
}

interface GitLabUser {
  id: number
  name: string
  email?: string
  commit_email?: string
}

interface GitLabContributor {
  name: string
  email: string
  commits: number
}

export interface GitLabStatsData {
  username: string
  totalStars: number
  totalCommits: number
  totalForks: number
  totalPRs: number
  fetchedAt: string
}

export class GitLabStatsFetcher {
  private base = 'https://gitlab.com/api/v4'

  constructor(
    private http: HttpService,
    private username: string
  ) {}

  async fetch(): Promise<GitLabStatsData> {
    const projects = await this.http.paginateByPage<GitLabProject>(
      `${this.base}/users/${this.username}/projects?membership=true`,
      100
    )

    const totalStars = projects.reduce((sum, p) => sum + p.star_count, 0)
    const totalForks = projects.reduce((sum, p) => sum + p.forks_count, 0)

    const user = await this.http.get<GitLabUser>(`${this.base}/user`)

    const counts = await Promise.all(
      projects.map((project) =>
        Promise.all([
          this.http.countFromHeader(
            `${this.base}/projects/${project.id}/merge_requests?state=all&author_id=${user.id}&per_page=1`,
            'X-Total'
          ),
          this.http
            .get<
              GitLabContributor[]
            >(`${this.base}/projects/${project.id}/repository/contributors`)
            .then((contributors) => {
              const match = contributors.find(
                (c) =>
                  c.email === user.commit_email ||
                  c.email === user.email ||
                  c.name === user.name
              )
              return match?.commits ?? 0
            })
        ])
      )
    )

    const totalPRs = counts.reduce((sum, [mrs]) => sum + mrs, 0)
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
