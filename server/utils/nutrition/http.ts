type FetchJsonOptions = {
  url: string
  method?: string
  headers?: HeadersInit
  body?: BodyInit | null
  timeoutMs?: number
  provider: string
}

export class ExternalNutritionHttpError extends Error {
  constructor(
    message: string,
    readonly provider: string,
    readonly statusCode: number | null,
    readonly kind: 'network' | 'timeout' | 'rate_limit' | 'http' | 'invalid_response',
    readonly responseBody?: string | null,
  ) {
    super(message)
    this.name = 'ExternalNutritionHttpError'
  }
}

export async function fetchJson<T>(options: FetchJsonOptions): Promise<T> {
  const controller = new AbortController()
  const timeoutMs = options.timeoutMs ?? 12000
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(options.url, {
      method: options.method ?? 'GET',
      headers: options.headers,
      body: options.body ?? null,
      signal: controller.signal,
    })

    if (!response.ok) {
      const responseBody = await safeReadText(response)
      const kind = response.status === 429 ? 'rate_limit' : 'http'
      throw new ExternalNutritionHttpError(
        `${options.provider} respondió ${response.status}.`,
        options.provider,
        response.status,
        kind,
        responseBody,
      )
    }

    try {
      return await response.json() as T
    } catch {
      const responseBody = await safeReadText(response)
      throw new ExternalNutritionHttpError(
        `${options.provider} devolvió una respuesta inválida.`,
        options.provider,
        response.status,
        'invalid_response',
        responseBody,
      )
    }
  } catch (error) {
    if (error instanceof ExternalNutritionHttpError) {
      throw error
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new ExternalNutritionHttpError(
        `${options.provider} agotó el tiempo de espera.`,
        options.provider,
        null,
        'timeout',
      )
    }

    throw new ExternalNutritionHttpError(
      `${options.provider} no respondió correctamente.`,
      options.provider,
      null,
      'network',
    )
  } finally {
    clearTimeout(timeout)
  }
}

async function safeReadText(response: Response) {
  try {
    return await response.text()
  } catch {
    return null
  }
}
