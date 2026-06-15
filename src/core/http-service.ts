export class HttpService {
  private headers: Record<string, string>

  constructor(token?: string) {
    this.headers = {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'User-Agent': 'github-stats-generator'
    }
  }

  async get<T>(url: string, accept?: string): Promise<T> {
    const headers: Record<string, string> = {
      ...this.headers,
      ...(accept ? { Accept: accept } : {})
    }
    const res: Response = await fetch(url, { headers })
    if (res.status === 401) throw new Error('Invalid or missing token')
    if (res.status === 403 || res.status === 429) {
      const retryAfter: string = res.headers.get('Retry-After') || 'unknown'
      throw new Error(`Rate limit hit — retry after ${retryAfter} seconds`)
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  }

  async paginate<T>(initialUrl: string, accept?: string): Promise<T[]> {
    const results: T[] = []
    let url: string | null = initialUrl

    while (url) {
      const headers: Record<string, string> = {
        ...this.headers,
        ...(accept ? { Accept: accept } : {})
      }
      const res: Response = await fetch(url, { headers })
      if (res.status === 401) throw new Error('Invalid or missing token')
      if (res.status === 403 || res.status === 429) {
        const retryAfter: string = res.headers.get('Retry-After') || 'unknown'
        throw new Error(`Rate limit hit — retry after ${retryAfter} seconds`)
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const data: T[] = await res.json()
      results.push(...data)

      const linkHeader: string | null = res.headers.get('Link')
      url = null
      if (linkHeader) {
        const match: RegExpMatchArray | null = linkHeader.match(
          /<([^>]+)>;\s*rel="next"/
        )
        if (match) url = match[1]
      }
    }

    return results
  }
}
