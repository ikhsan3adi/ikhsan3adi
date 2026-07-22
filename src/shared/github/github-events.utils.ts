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
        number: number
        pull_request: { number: number; title?: string }
        label?: { name: string }
        assignee?: { login: string }
      }
      const prNum = payload.number || payload.pull_request?.number
      const action = payload.action
      const title = payload.pull_request?.title ?? ''
      if (action === 'merged') {
        details = title
          ? `merged PR #${prNum}: ${title}`
          : `merged PR #${prNum}`
      } else if (action === 'labeled' && payload.label) {
        details = `labeled PR #${prNum}: ${payload.label.name}`
      } else if (action === 'assigned' && payload.assignee) {
        details = `assigned PR #${prNum} to ${payload.assignee.login}`
      } else {
        details = title
          ? `${action} PR #${prNum}: ${title}`
          : `${action} PR #${prNum}`
      }
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
    case 'PublicEvent':
      details = 'made a repository public'
      break
    default:
      details = event.type.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()
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

function getDayGroup(timestamp: string): string {
  const now = new Date()
  const eventDate = new Date(timestamp)
  const diffMs = now.getTime() - eventDate.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  if (diffDays <= 7) return `${diffDays} days ago`
  return eventDate.toLocaleDateString('ja-JP', {
    month: 'short',
    day: 'numeric'
  })
}

const DAY_ORDER: Record<string, number> = {
  today: 0,
  yesterday: 1
}

function daySortKey(label: string): number {
  if (label in DAY_ORDER) return DAY_ORDER[label]
  const match = label.match(/^(\d+) days ago$/)
  if (match) return parseInt(match[1])
  return 999
}

export function cleanGitHubEvents(
  events: GitHubEvent[]
): GitHubActivitySummary {
  // Filter to public events only
  const publicEvents = events.filter((e) => e.public)

  // Convert to cleaned format
  const cleaned = publicEvents.map(cleanEvent)

  // Sort by time (newest first) for better handling
  cleaned.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

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

  // Filter events to only include the last 7 days
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
  const filteredEvents = events.filter(
    (e) => new Date(e.createdAt) >= oneWeekAgo
  )

  // Group events by day with repo information
  const dayGroups: Record<string, Record<string, string[]>> = {}

  for (const e of filteredEvents) {
    const day = getDayGroup(e.createdAt)
    const repo = e.repo
    const action = e.details

    if (!dayGroups[day]) {
      dayGroups[day] = {}
    }

    if (!dayGroups[day][repo]) {
      dayGroups[day][repo] = []
    }

    if (!dayGroups[day][repo].includes(action)) {
      dayGroups[day][repo].push(action)
    }
  }

  // Sort days: today first, yesterday, then N days ago ascending
  const sortedTimeGroups: [string, Record<string, string[]>][] = Object.keys(
    dayGroups
  )
    .sort((a, b) => daySortKey(a) - daySortKey(b))
    .map((day) => [day, dayGroups[day]])

  const parts: string[] = []
  parts.push(`${username}'s recent GitHub activity:`)

  for (const [time, repoActivities] of sortedTimeGroups) {
    parts.push(`${time.charAt(0).toUpperCase() + time.slice(1)}:`)

    // Sort repos by their most important activity within this time period
    const sortedRepos = Object.entries(repoActivities).sort(([, a], [, b]) => {
      // Prioritize push events over stars
      const hasPushA = a.some((act) => act.includes('pushed'))
      const hasPushB = b.some((act) => act.includes('pushed'))
      if (hasPushA && !hasPushB) return -1
      if (!hasPushA && hasPushB) return 1
      return 0
    })

    for (const [repo, actions] of sortedRepos) {
      if (actions.length === 1) {
        parts.push(`  - ${repo}: ${actions[0]}`)
      } else {
        parts.push(`  - ${repo}:`)
        for (const action of actions) {
          parts.push(`    - ${action}`)
        }
      }
    }
  }

  if (sortedTimeGroups.length === 0) {
    return 'No recent GitHub activity.'
  }

  return parts.join('\n')
}
