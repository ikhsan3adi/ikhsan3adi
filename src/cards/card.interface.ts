import type { FontSpec } from '../core/types'
import type { HttpService } from '../core/http-service'

export interface CardAssets {
  tailwindInput: string
  fonts?: FontSpec[]
  iconNames?: string[] | Record<string, string>
  extraCss?: string
}

export interface ICard {
  readonly id: string
  fetchData(): Promise<Record<string, unknown>>
  getTemplate(): string
  getConfig(): Record<string, unknown>
  getAssets(): CardAssets
}
