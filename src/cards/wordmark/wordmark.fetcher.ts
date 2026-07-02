import { LLMService } from '../../core/llm-service'

export class WordmarkFetcher {
  constructor(private llmService: LLMService) {
    const jakartaDate = new Date(Date.now() + this.TIMEZONE * 60 * 60 * 1000)

    this.day = jakartaDate.getUTCDay()

    this.PROMPT = `You are a minimal, humble, and conversational text generator. Your only job is to generate a single daily status sentence for a GitHub profile based on the day of the week provided.

Strictly follow these guidelines:
1. Tone: Extremely grounded, casual, and relaxed. Speak like a normal human chatting casually—never poetic, never overly ambitious, and never formal.
2. Structure: Start naturally with a casual mention of the day or time (e.g., "Just a simple start to Monday...", "It's already Wednesday...", "Spending this Tuesday...").
3. Content: Focus on simple human elements—handling daily routines, sorting through everyday problems, learning something new, or trying to make life just a bit easier for people.
4. Constraints: 
  - Write exactly ONE short sentence.
  - Do NOT use heavy software/engineering jargon (avoid words like "architecture", "resilient", "engineering", "complexities").
  - Do NOT mention coffee.
  - Do NOT use emojis.
  - Do NOT wrap the output in quotes.
  - DO NOT mention tech stack, framework, or libraries.
  - Prefer natural language over technical jargon, but
  - Randomly choosing between English and Indonesian or Mix of both

Reference Examples of the style and vocabulary required:
${this.sentences.map((sentence) => `- "${sentence}"`).join('\n')}

Input day (Date.getUTCDay()): ${this.day}
    `
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

  async fetch(): Promise<{ sentence: string }> {
    try {
      const res = await this.llmService.chatCompletion(this.PROMPT)

      return { sentence: res.choices[0].message.content }
    } catch (e) {
      console.log('Error fetching wordmark:', e)
      return { sentence: this.sentences[this.day] }
    }
  }
}
