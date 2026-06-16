import { readFileSync } from 'fs'
import { resolve } from 'path'
import type { HttpService } from '../../core/http-service'
import type { CardAssets, ICard } from '../card.interface'
import { GITLAB_STATS_CONFIG } from './gitlab-stats.config'
import { GitLabStatsFetcher } from './gitlab-stats.fetcher'

export class GitLabStatsCard implements ICard {
  readonly id = 'gitlab-stats'

  constructor(private username: string) {}

  async fetchData(http: HttpService): Promise<Record<string, unknown>> {
    const fetcher = new GitLabStatsFetcher(http, this.username)
    const data = await fetcher.fetch()
    return { ...data, platformName: 'GitLab', prLabel: 'Merge Requests' }
  }

  getTemplate(): string {
    return readFileSync(
      resolve(__dirname, '..', 'github-stats', 'stats-template.html'),
      'utf-8'
    )
  }

  getConfig(): Record<string, unknown> {
    return { ...GITLAB_STATS_CONFIG }
  }

  getAssets(): CardAssets {
    return {
      tailwindInput: readFileSync(
        resolve(__dirname, '..', '..', 'input.css'),
        'utf-8'
      ),
      fonts: [
        {
          pkg: '@fontsource/space-grotesk',
          files: ['latin-500.css']
        },
        { pkg: '@fontsource/cascadia-mono', files: ['latin-700.css'] }
      ],
      iconNames: {
        star: 'star',
        commit: 'code-commit',
        fork: 'code-fork',
        pr: 'code-pull-request'
      }
    }
  }
}
