import { HttpService } from './http-service'
import {
  ChatCompletionMessage,
  ChatCompletionRequest,
  ChatCompletionRequestFormatType,
  ChatCompletionResponse
} from './llm.types'

export class LLMService {
  constructor(
    baseUrl: string,
    apiKey: string,
    model: string,
    http?: HttpService
  ) {
    this.baseUrl = baseUrl
    this.apiKey = apiKey
    this.model = model ?? 'big-pickle'
    this.http = http ?? new HttpService(this.apiKey)
  }

  private http: HttpService
  private baseUrl?: string
  private apiKey?: string
  private model: string

  async chatCompletion(
    messages: ChatCompletionMessage[],
    response_format_type: ChatCompletionRequestFormatType = 'text'
  ): Promise<ChatCompletionResponse> {
    if (!this.apiKey) {
      throw new Error('API key is not set')
    }

    const body: ChatCompletionRequest = {
      model: this.model,
      messages,
      response_format: { type: response_format_type }
    }

    const res = await this.http.post<ChatCompletionResponse>(
      `${this.baseUrl}/chat/completions`,
      body
    )

    return res
  }
}
