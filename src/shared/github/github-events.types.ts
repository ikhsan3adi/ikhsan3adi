interface GitHubActor {
  id: number
  login: string
  avatar_url: string
}

interface GitHubRepo {
  id: number
  name: string
  url: string
}

interface PushEventPayload {
  push_id: number
  size: number
  distinct_size: number
  ref: string
  head: string
  before: string
  commits: Array<{
    sha: string
    message: string
    author: { name: string; email: string }
  }>
}

interface CreateEventPayload {
  ref: string
  ref_type: string
  master_branch: string
  description: string | null
}

interface DeleteEventPayload {
  ref: string
  ref_type: string
}

interface IssuesEventPayload {
  action: string
  issue: {
    number: number
    title: string
    state: string
  }
}

interface IssueCommentEventPayload {
  action: string
  issue: {
    number: number
    title: string
  }
  comment: {
    body: string
  }
}

interface PullRequestEventPayload {
  action: string
  pull_request: {
    number: number
    title: string
    state: string
    merged: boolean
  }
}

interface PullRequestReviewEventPayload {
  action: string
  pull_request: {
    number: number
    title: string
  }
  review: {
    state: string
  }
}

interface ForkEventPayload {
  forkee: {
    full_name: string
  }
}

interface ReleaseEventPayload {
  action: string
  release: {
    tag_name: string
    name: string
  }
}

interface StarEventPayload {
  action: string
}

type GitHubEventPayload =
  | PushEventPayload
  | CreateEventPayload
  | DeleteEventPayload
  | IssuesEventPayload
  | IssueCommentEventPayload
  | PullRequestEventPayload
  | PullRequestReviewEventPayload
  | ForkEventPayload
  | ReleaseEventPayload
  | StarEventPayload
  | Record<string, unknown>

export type GitHubEventType =
  | 'PushEvent'
  | 'CreateEvent'
  | 'DeleteEvent'
  | 'IssuesEvent'
  | 'IssueCommentEvent'
  | 'PullRequestEvent'
  | 'PullRequestReviewEvent'
  | 'ForkEvent'
  | 'ReleaseEvent'
  | 'StarEvent'
  | 'WatchEvent'
  | string

export interface GitHubEvent {
  id: string
  type: GitHubEventType
  actor: GitHubActor
  repo: GitHubRepo
  public: boolean
  created_at: string
  payload: GitHubEventPayload
}

export interface CleanedGitHubEvent {
  type: GitHubEventType
  repo: string
  details: string
  createdAt: string
}

export interface GitHubActivitySummary {
  totalEvents: number
  recentEvents: CleanedGitHubEvent[]
  activeRepos: string[]
  eventCounts: Record<string, number>
}
