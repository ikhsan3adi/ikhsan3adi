export type ChatCompletionRequestFormatType = 'text' | 'json_object'

export interface ChatCompletionMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatCompletionRequest {
  model: string
  messages: ChatCompletionMessage[]
  response_format?: { type: ChatCompletionRequestFormatType }
}

export interface ChatCompletionResponse {
  choices: Array<{
    message: { content: string }
  }>
}
