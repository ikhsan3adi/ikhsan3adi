const MAX_RETRIES = 3

export class HttpService {
  private headers: Record<string, string>

  constructor(token?: string) {
    this.headers = {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
      'User-Agent': 'stats-generator'
    }
  }

  private async _fetch(
    method: 'GET' | 'POST',
    url: string,
    data: any = null,
    accept?: string,
    headers: Record<string, string> = {}
  ): Promise<Response> {
    const mergedHeaders: Record<string, string> = {
      ...this.headers,
      ...(accept ? { Accept: accept } : {}),
      ...headers
    }

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const res: Response = await fetch(url, {
        method,
        headers: mergedHeaders,
        body: data ? JSON.stringify(data) : null
      })

      if (res.status === 401) throw new Error('Invalid or missing token')

      if (res.status === 403 || res.status === 429) {
        const retryAfter: string = res.headers.get('Retry-After') || '60'
        console.warn(
          `Rate limited on ${url} — retry after ${retryAfter}s (attempt ${attempt}/${MAX_RETRIES})`
        )
        if (attempt < MAX_RETRIES) {
          await new Promise((r) =>
            setTimeout(r, parseInt(retryAfter, 10) * 1000)
          )
          continue
        }
        throw new Error(`Rate limit hit — retry after ${retryAfter} seconds`)
      }

      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
      return res
    }

    throw new Error(`Max retries exceeded for ${url}`)
  }

  async get<T>(
    url: string,
    accept?: string,
    headers?: Record<string, string>
  ): Promise<T> {
    const res = await this._fetch('GET', url, null, accept, headers)
    return res.json()
  }

  async post<T>(
    url: string,
    data: any,
    accept?: string,
    headers?: Record<string, string>
  ): Promise<T> {
    const res = await this._fetch('POST', url, data, accept, headers)
    return res.json()
  }

  async paginate<T>(
    initialUrl: string,
    accept?: string,
    headers?: Record<string, string>
  ): Promise<T[]> {
    const results: T[] = []
    let url: string | null = initialUrl

    while (url) {
      const res = await this._fetch('GET', url, null, accept, headers)
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

  async paginateByPage<T>(
    baseUrl: string,
    perPage: number = 100,
    accept?: string,
    headers?: Record<string, string>
  ): Promise<T[]> {
    const results: T[] = []
    let page = 1
    const separator = baseUrl.includes('?') ? '&' : '?'

    while (true) {
      const url = `${baseUrl}${separator}page=${page}&per_page=${perPage}`
      const res = await this._fetch('GET', url, null, accept, headers)
      const data: T[] = await res.json()
      if (data.length === 0) break
      results.push(...data)
      page++
    }

    return results
  }

  async countFromHeader(
    url: string,
    headerName: string = 'X-Total-Count',
    accept?: string,
    headers?: Record<string, string>
  ): Promise<number> {
    const res = await this._fetch('GET', url, null, accept, headers)
    const total = res.headers.get(headerName)
    return total ? parseInt(total, 10) : 0
  }
}
