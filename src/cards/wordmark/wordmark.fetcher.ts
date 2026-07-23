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

    this.PROMPT = `Generate TWO daily status sentences for a GitHub profile — one in Indonesian, one in English.

Guidelines for BOTH sentences:
1. Tone: Extremely grounded, casual, and relaxed. Speak like a normal human chatting casually—never poetic, never overly ambitious, and never formal.
2. Structure: Start naturally with a casual mention of the day in the respective language (e.g. "Senin yang sederhana..." / "Just a simple start to Monday...").
3. Content: Focus on simple human elements—handling daily routines, sorting through everyday problems, learning something new, or trying to make life just a bit easier for people.
4. Constraints:
  - Exactly ONE short sentence per language.
  - Do NOT mention coffee.
  - Do NOT use emojis.
  - Do NOT wrap in quotes.
  - Use my GitHub activity for reference.
  - Prefer natural language over technical jargon.

Input day (Date.getUTCDay()): ${this.day}

Return in this exact format (no extra text):
SENTENCE_ID|||SENTENCE_EN`
  }

  readonly TIMEZONE = 7 // Asia/Jakarta

  private readonly fallbacks = [
    {
      id: 'Minggu santai, reset pikiran buat minggu depan.',
      en: 'Just a relaxed Sunday evening to reset the mind for whatever comes next.'
    },
    {
      id: 'Senin sederhana, jalan pelan-pelan aja.',
      en: 'Just a simple start to Monday, taking things one step at a time.'
    },
    {
      id: 'Selasa biasa, ngurus bug sehari-hari.',
      en: 'Spending my Tuesday figuring out everyday bugs and keeping it steady.'
    },
    {
      id: 'Rabu udah tengah minggu, tetap jalan.',
      en: "It's Wednesday already—halfway through the week and just making things work."
    },
    {
      id: 'Kamis pagi nge-tweak kode biar makin enak.',
      en: 'Tinkering with code this Thursday morning to make everyday tasks just a bit easier.'
    },
    {
      id: 'Jumat sore, finishing ide-ide sederhana.',
      en: 'Finishing up a few simple ideas as Friday comes to a quiet end.'
    },
    {
      id: 'Sabtu istirahat, recharge dulu.',
      en: 'Taking a break this Saturday to rest, recharge, and step away from the screen.'
    }
  ]

  private day: number
  private PROMPT: string
  private username: string
  private ghToken?: string

  async fetch(): Promise<{ sentenceId: string; sentenceEn: string }> {
    try {
      const events = await this.httpService.get<GitHubEvent[]>(
        `https://api.github.com/users/${this.username}/events/public`,
        'application/vnd.github.v3+json',
        this.ghToken ? { Authorization: `Bearer ${this.ghToken}` } : undefined
      )

      const summary = cleanGitHubEvents(events)
      const systemContent = buildSystemPrompt(this.username, summary)

      console.log(systemContent)

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
      const raw = res.choices[0].message.content
      const parts = raw.split('|||').map((s) => s.trim())

      return {
        sentenceId: parts[0] || this.fallbacks[this.day].id,
        sentenceEn: parts[1] || this.fallbacks[this.day].en
      }
    } catch (e) {
      console.log('Error fetching wordmark:', e)
      return {
        sentenceId: this.fallbacks[this.day].id,
        sentenceEn: this.fallbacks[this.day].en
      }
    }
  }
}
