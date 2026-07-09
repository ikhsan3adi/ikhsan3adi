import { HttpService } from '../../core/http-service'
import { LLMService } from '../../core/llm-service'
import { ChatCompletionMessage } from '../../core/llm.types'
import type { GitHubEvent } from '../../shared/github/github-events.types'
import {
  cleanGitHubEvents,
  buildSystemPrompt
} from '../../shared/github/github-events.utils'

export class WordmarkFetcher {
  constructor(
    private httpService: HttpService,
    private llmService: LLMService,
    username?: string,
    ghToken?: string
  ) {
    this.username = username ?? 'ikhsan3adi'
    this.ghToken = ghToken

    const date = new Date(Date.now() + this.TIMEZONE * 60 * 60 * 1000)

    this.day = date.getUTCDay()

    this.PROMPT = `You are a minimal, humble, and conversational text generator. Your only job is to generate a single daily status sentence for a GitHub profile based on the day of the week provided.

Strictly follow these guidelines:
1. Tone: Extremely grounded, casual, and relaxed. Speak like a normal human chatting casually—never poetic, never overly ambitious, and never formal.
2. Structure: Start naturally with a casual mention of the day or time (e.g., "Just a simple start to Monday...", "It's already Wednesday...", "Spending this Tuesday...").
3. Content: Focus on simple human elements—handling daily routines, sorting through everyday problems, learning something new, or trying to make life just a bit easier for people.
4. Constraints: 
  - Write exactly ONE short sentence.
  - Do NOT mention coffee.
  - Do NOT use emojis.
  - Do NOT wrap the output in quotes.
  - USE my github activity for more information.
  - Prefer natural language over technical jargon, but
  - Randomly choosing between English and Indonesian or Mix of both.
  - USE english for day name.

Input day (Date.getUTCDay()): ${this.day}`
  }

  readonly TIMEZONE = 7 // Asia/Jakarta

  private readonly sentences = [
    'Just a relaxed Sunday evening to reset the mind for whatever comes next.',
    'Just a simple start to Monday, taking things one step at a time.',
    'Spending my Tuesday figuring out everyday bugs and keeping it steady.',
    "It's Wednesday already—halfway through the week and just making things work.",
    'Tinkering with code this Thursday morning to make everyday tasks just a bit easier.',
    'Finishing up a few simple ideas as Friday comes to a quiet end.',
    'Taking a break this Saturday to rest, recharge, and step away from the screen.'
  ]

  private day: number
  private PROMPT: string
  private username: string
  private ghToken?: string

  async fetch(): Promise<{ sentence: string }> {
    try {
      const events = await this.httpService.get<GitHubEvent[]>(
        `https://api.github.com/users/${this.username}/events/public`,
        'application/vnd.github.v3+json',
        this.ghToken ? { Authorization: `Bearer ${this.ghToken}` } : undefined
      )

      const summary = cleanGitHubEvents(events)
      const systemContent = buildSystemPrompt(this.username, summary)

      const messages: ChatCompletionMessage[] = [
        {
          role: 'system',
          content: systemContent
        },
        {
          role: 'user',
          content: this.PROMPT
        }
      ]

      const res = await this.llmService.chatCompletion(messages)

      return { sentence: res.choices[0].message.content }
    } catch (e) {
      console.log('Error fetching wordmark:', e)
      return { sentence: this.sentences[this.day] }
    }
  }
}
