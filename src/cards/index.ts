import type { ICard } from './card.interface'
import { GitHubStatsCard } from './github-stats/github-stats.card'
import { CodebergStatsCard } from './codeberg-stats/codeberg-stats.card'
import { GitLabStatsCard } from './gitlab-stats/gitlab-stats.card'
import { WordmarkCard } from './wordmark/wordmark.card'

type CardFactory = (options: Record<string, unknown>) => ICard

const registry: Record<string, CardFactory> = {
  'github-stats': (opts) => new GitHubStatsCard(opts.username as string),
  'codeberg-stats': (opts) => new CodebergStatsCard(opts.username as string),
  'gitlab-stats': (opts) => new GitLabStatsCard(opts.username as string),
  wordmark: () => new WordmarkCard()
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
