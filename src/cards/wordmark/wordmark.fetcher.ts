import type { HttpService } from '../../core/http-service'

export class WordmarkFetcher {
  constructor(private http: HttpService) {}

  private readonly sentences = [
    'Just a relaxed Sunday evening to reset the mind for whatever comes next.',
    'Just a simple start to Monday, taking things one step at a time.',
    'Spending my Tuesday figuring out everyday bugs and keeping it steady.',
    "It's Wednesday already—halfway through the week and just making things work.",
    'Tinkering with code this Thursday morning to make everyday tasks just a bit easier.',
    'Finishing up a few simple ideas as Friday comes to a quiet end.',
    'Taking a break this Saturday to rest, recharge, and step away from the screen.'
  ]

  readonly TIMEZONE = 7 // Asia/Jakarta

  async fetch(): Promise<{ sentence: string }> {
    const jakartaDate = new Date(Date.now() + this.TIMEZONE * 60 * 60 * 1000)
    const day = jakartaDate.getUTCDay()
    return { sentence: this.sentences[day] }
  }
}
