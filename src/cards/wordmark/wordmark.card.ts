import { readFileSync } from 'fs'
import { resolve } from 'path'
import type { ICard, CardAssets } from '../card.interface'
import { WordmarkFetcher } from './wordmark.fetcher'
import { LLMService } from '../../core/llm-service'
import { HttpService } from '../../core/http-service'

const SVG_LIGHT = readFileSync(
  resolve(__dirname, 'wordmark-ikhsan3adi-light.svg'),
  'utf-8'
)
const SVG_DARK = readFileSync(
  resolve(__dirname, 'wordmark-ikhsan3adi-dark.svg'),
  'utf-8'
)

export class WordmarkCard implements ICard {
  readonly id = 'wordmark'
  private fetcher: WordmarkFetcher

  constructor(
    httpService: HttpService,
    llmService: LLMService,
    username?: string,
    ghToken?: string
  ) {
    this.fetcher = new WordmarkFetcher(
      httpService,
      llmService,
      username,
      ghToken
    )
  }

  async fetchData(): Promise<Record<string, unknown>> {
    const data = await this.fetcher.fetch()
    return {
      ...data,
      wordmarkSvgLight: SVG_LIGHT,
      wordmarkSvgDark: SVG_DARK
    }
  }

  getTemplate(): string {
    return readFileSync(resolve(__dirname, 'template.html'), 'utf-8')
  }

  getConfig(): Record<string, unknown> {
    return { cardWidth: 667, cardHeight: 176 }
  }

  getAssets(): CardAssets {
    return {
      tailwindInput: readFileSync(resolve(__dirname, 'input.css'), 'utf-8'),
      fonts: [
        {
          pkg: '@fontsource/space-grotesk',
          files: ['latin-500.css']
        }
      ]
    }
  }
}
