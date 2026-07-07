import type {
  GitHubEvent,
  CleanedGitHubEvent,
  GitHubActivitySummary
} from './github-events.types'

function cleanEvent(event: GitHubEvent): CleanedGitHubEvent {
  const repo = event.repo.name.split('/').pop() || event.repo.name
  const createdAt = new Date(event.created_at).toISOString()

  let details = ''

  switch (event.type) {
    case 'PushEvent': {
      const payload = event.payload as {
        commits?: Array<{ message: string }>
        ref?: string
      }
      const commits = payload.commits || []
      const count = commits.length
      if (count > 0) {
        details = `pushed ${count} commit${count !== 1 ? 's' : ''}`
        const msgs = commits.slice(0, 3).map((c) => c.message.split('\n')[0])
        details += `: ${msgs.join('; ')}`
      } else {
        const branch = payload.ref?.replace('refs/heads/', '') || 'main'
        details = `pushed to ${branch}`
      }
      break
    }
    case 'CreateEvent': {
      const payload = event.payload as {
        ref_type: string
        ref?: string
        description?: string
      }
      details = `created ${payload.ref_type}`
      if (payload.ref) details += ` "${payload.ref}"`
      break
    }
    case 'DeleteEvent': {
      const payload = event.payload as { ref_type: string; ref: string }
      details = `deleted ${payload.ref_type} "${payload.ref}"`
      break
    }
    case 'IssuesEvent': {
      const payload = event.payload as {
        action: string
        issue: { number: number; title: string }
      }
      details = `${payload.action} issue #${payload.issue.number}: ${payload.issue.title}`
      break
    }
    case 'IssueCommentEvent': {
      const payload = event.payload as {
        action: string
        issue: { number: number; title: string }
      }
      details = `${payload.action} comment on issue #${payload.issue.number}: ${payload.issue.title}`
      break
    }
    case 'PullRequestEvent': {
      const payload = event.payload as {
        action: string
        pull_request: { number: number; title: string; merged: boolean }
      }
      const pr = payload.pull_request
      details = `${payload.action} PR #${pr.number}: ${pr.title}`
      if (pr.merged) details += ' (merged)'
      break
    }
    case 'PullRequestReviewEvent': {
      const payload = event.payload as {
        action: string
        pull_request: { number: number; title: string }
        review: { state: string }
      }
      details = `reviewed PR #${payload.pull_request.number}: ${payload.review.state}`
      break
    }
    case 'ForkEvent': {
      const payload = event.payload as {
        forkee: { full_name: string }
      }
      details = `forked to ${payload.forkee.full_name}`
      break
    }
    case 'ReleaseEvent': {
      const payload = event.payload as {
        action: string
        release: { tag_name: string; name: string }
      }
      details = `${payload.action} release ${payload.release.tag_name}`
      break
    }
    case 'WatchEvent':
      details = 'starred the repo'
      break
    default:
      details = event.type
  }

  return { type: event.type, repo, details, createdAt }
}

const EVENT_PRIORITY: Record<string, number> = {
  PullRequestEvent: 1,
  PullRequestReviewEvent: 2,
  PushEvent: 3,
  IssuesEvent: 4,
  IssueCommentEvent: 5,
  ReleaseEvent: 6,
  CreateEvent: 7,
  DeleteEvent: 8,
  ForkEvent: 9,
  WatchEvent: 10
}

function getEventPriority(type: string): number {
  return EVENT_PRIORITY[type] ?? 99
}

export function cleanGitHubEvents(
  events: GitHubEvent[]
): GitHubActivitySummary {
  const cleaned = events
    .filter((e) => e.public)
    .map(cleanEvent)
    .sort((a, b) => getEventPriority(a.type) - getEventPriority(b.type))

  const activeRepos = [...new Set(cleaned.map((e) => e.repo))]

  const eventCounts: Record<string, number> = {}
  for (const e of cleaned) {
    eventCounts[e.type] = (eventCounts[e.type] || 0) + 1
  }

  return {
    totalEvents: cleaned.length,
    recentEvents: cleaned,
    activeRepos,
    eventCounts
  }
}

export function buildSystemPrompt(
  username: string,
  summary: GitHubActivitySummary
): string {
  const events = summary.recentEvents
  if (events.length === 0) {
    return 'No recent GitHub activity.'
  }

  const repoActivity: Record<
    string,
    { actions: string[]; minPriority: number }
  > = {}
  for (const e of events) {
    if (!repoActivity[e.repo]) {
      repoActivity[e.repo] = {
        actions: [],
        minPriority: getEventPriority(e.type)
      }
    }
    repoActivity[e.repo].actions.push(e.details)
    const p = getEventPriority(e.type)
    if (p < repoActivity[e.repo].minPriority) {
      repoActivity[e.repo].minPriority = p
    }
  }

  const sorted = Object.entries(repoActivity).sort(
    ([, a], [, b]) => a.minPriority - b.minPriority
  )

  const parts: string[] = []
  for (const [repo, { actions }] of sorted) {
    const unique = [...new Set(actions)]
    parts.push(`${repo}: ${unique.join(', ')}`)
  }

  return `${username}'s recent GitHub activity:\n${parts.join('\n')}`
}
