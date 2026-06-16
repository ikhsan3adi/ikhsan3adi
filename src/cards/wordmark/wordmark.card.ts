import { readFileSync } from 'fs'
import { resolve } from 'path'
import type { ICard, CardAssets } from '../card.interface'
import type { HttpService } from '../../core/http-service'
import { WordmarkFetcher } from './wordmark.fetcher'

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

  constructor() {
    this.fetcher = new WordmarkFetcher(null as any)
  }

  async fetchData(http: HttpService): Promise<Record<string, unknown>> {
    this.fetcher = new WordmarkFetcher(http)
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
    return { cardWidth: 567, cardHeight: 176 }
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
