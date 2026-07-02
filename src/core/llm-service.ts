import { HttpService } from './http-service'
import {
  ChatCompletionRequest,
  ChatCompletionRequestFormatType,
  ChatCompletionResponse
} from './llm.types'

export class LLMService {
  constructor(
    http?: HttpService,
    baseUrl?: string,
    apiKey?: string,
    model?: string
  ) {
    this.baseUrl = baseUrl ?? 'https://opencode.ai/zen/v1'
    this.apiKey = apiKey ?? process.env.OPENAI_API_KEY!
    this.model = model ?? 'big-pickle'
    this.http = http ?? new HttpService(this.apiKey)
  }

  private http: HttpService
  private baseUrl: string
  private apiKey: string
  private model: string

  async chatCompletion(
    prompt: string,
    response_format_type: ChatCompletionRequestFormatType = 'text'
  ): Promise<ChatCompletionResponse> {
    const body: ChatCompletionRequest = {
      model: this.model,
      messages: [
        {
          role: 'system',
          content: prompt
        }
      ],
      response_format: { type: response_format_type }
    }

    const res = await this.http.post<ChatCompletionResponse>(
      `${this.baseUrl}/chat/completions`,
      body
    )

    return res
  }
}
