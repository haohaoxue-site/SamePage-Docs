import type {
  ChatProviderConfig,
  ChatProviderLookup,
  ChatSessionDetail,
  ChatSessionSummary,
  GetChatModelsResponseDto,
} from './typing'
import { SERVER_PATH } from '@haohaoxue/samepage-contracts'
import { useAuthStore } from '@/stores/auth'
import { axios } from '@/utils/axios'

export * from './typing'

const API_BASE_URL = SERVER_PATH

export function getChatSessions(): Promise<ChatSessionSummary[]> {
  return axios.request({
    method: 'get',
    url: '/chat/sessions',
  })
}

export function createChatSession(): Promise<ChatSessionDetail> {
  return axios.request({
    method: 'post',
    url: '/chat/sessions',
  })
}

export function getChatSession(sessionId: string): Promise<ChatSessionDetail> {
  return axios.request({
    method: 'get',
    url: `/chat/sessions/${sessionId}`,
  })
}

export function deleteChatSession(sessionId: string): Promise<null> {
  return axios.request({
    method: 'delete',
    url: `/chat/sessions/${sessionId}`,
  })
}

export async function getChatModels(
  provider: ChatProviderLookup,
): Promise<GetChatModelsResponseDto> {
  return axios.request({
    method: 'post',
    url: '/chat/models',
    data: { provider },
  })
}

export async function streamChatCompletion(
  sessionId: string,
  provider: ChatProviderConfig,
  content: string,
  onChunk: (content: string) => void,
  onDone: () => void,
  onError: (error: Error) => void,
): Promise<void> {
  const authStore = useAuthStore()

  const response = await fetch(`${API_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authStore.accessToken}`,
    },
    body: JSON.stringify({
      sessionId,
      content,
      provider,
    }),
  })

  if (!response.ok) {
    onError(new Error(await readApiError(response)))
    return
  }

  const reader = response.body?.getReader()
  if (!reader) {
    onError(new Error('no response body'))
    return
  }

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done)
        break

      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed || !trimmed.startsWith('data: '))
          continue

        const data = trimmed.slice(6)
        if (data === '[DONE]') {
          onDone()
          return
        }

        try {
          const parsed = JSON.parse(data) as { content?: string, error?: string }
          if (parsed.error) {
            onError(new Error(parsed.error))
            return
          }
          if (parsed.content) {
            onChunk(parsed.content)
          }
        }
        catch {
        }
      }
    }

    onDone()
  }
  catch (error) {
    onError(error instanceof Error ? error : new Error(String(error)))
  }
}

async function readApiError(response: Response) {
  try {
    const payload = await response.json() as {
      message?: string | string[]
      error?: string
    }

    if (Array.isArray(payload.message) && payload.message.length) {
      return payload.message.join(', ')
    }

    if (typeof payload.message === 'string' && payload.message.trim()) {
      return payload.message
    }

    if (typeof payload.error === 'string' && payload.error.trim()) {
      return payload.error
    }
  }
  catch {
  }

  return `请求失败（HTTP ${response.status}）`
}
