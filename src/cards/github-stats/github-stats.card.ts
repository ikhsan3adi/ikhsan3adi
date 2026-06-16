import { readFileSync } from 'fs'
import { resolve } from 'path'
import type { HttpService } from '../../core/http-service'
import type { CardAssets, ICard } from '../card.interface'
import { GITHUB_STATS_CONFIG } from './github-stats.config'
import { GitHubStatsFetcher } from './github-stats.fetcher'

export class GitHubStatsCard implements ICard {
  readonly id = 'github-stats'

  constructor(private username: string) {}

  async fetchData(http: HttpService): Promise<Record<string, unknown>> {
    const fetcher = new GitHubStatsFetcher(http, this.username)
    const data = await fetcher.fetch()
    return { ...data }
  }

  getTemplate(): string {
    return readFileSync(resolve(__dirname, 'template.html'), 'utf-8')
  }

  getConfig(): Record<string, unknown> {
    return { ...GITHUB_STATS_CONFIG }
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
