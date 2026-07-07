import type { ICard } from './card.interface'
import { GitHubStatsCard } from './github-stats/github-stats.card'
import { CodebergStatsCard } from './codeberg-stats/codeberg-stats.card'
import { GitLabStatsCard } from './gitlab-stats/gitlab-stats.card'
import { WordmarkCard } from './wordmark/wordmark.card'
import { LLMService } from '../core/llm-service'
import { HttpService } from '../core/http-service'

type CardFactory = (options: Record<string, unknown>) => ICard

const registry: Record<string, CardFactory> = {
  'github-stats': (opts) =>
    new GitHubStatsCard(opts.http as HttpService, opts.username as string),
  'codeberg-stats': (opts) =>
    new CodebergStatsCard(opts.http as HttpService, opts.username as string),
  'gitlab-stats': (opts) =>
    new GitLabStatsCard(opts.http as HttpService, opts.username as string),
  wordmark: (opts) =>
    new WordmarkCard(
      opts.http as HttpService,
      opts.llmService as LLMService,
      opts.username as string | undefined,
      opts.ghToken as string | undefined
    )
}

export function createCard(
  id: string,
  options?: Record<string, unknown>
): ICard {
  const factory = registry[id]
  if (!factory) throw new Error(`Card not found: ${id}`)
  return factory(options || {})
}

export function listCards(): string[] {
  return Object.keys(registry)
}

export function registerCard(id: string, factory: CardFactory): void {
  registry[id] = factory
}
