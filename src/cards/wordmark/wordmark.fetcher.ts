import type { HttpService } from '../../core/http-service'

const sentences = [
  'Just a relaxed Sunday evening to reset the mind for whatever comes next.',
  'Just a simple start to Monday, taking things one step at a time.',
  'Spending my Tuesday figuring out everyday bugs and keeping it steady.',
  "It's Wednesday already—halfway through the week and just making things work.",
  'Tinkering with code this Thursday morning to make everyday tasks just a bit easier.',
  'Finishing up a few simple ideas as Friday comes to a quiet end.',
  'Taking a break this Saturday to rest, recharge, and step away from the screen.'
]

export class WordmarkFetcher {
  constructor(private http: HttpService) {}

  async fetch(): Promise<{ sentence: string }> {
    const day = new Date().getDay()
    return { sentence: sentences[day] }
  }
}
