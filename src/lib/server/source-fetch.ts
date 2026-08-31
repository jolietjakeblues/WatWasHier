export type SourceFailureKind = 'timeout' | 'http' | 'network' | 'invalid-response';

export class SourceFetchError extends Error {
  constructor(
    public readonly source: string,
    public readonly kind: SourceFailureKind,
    message: string,
    public readonly status?: number,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = 'SourceFetchError';
  }
}

export interface SourceFetchOptions extends RequestInit {
  source: string;
  timeoutMs?: number;
}

export async function fetchSource(
  input: string | URL,
  { source, timeoutMs = 12_000, signal, ...init }: SourceFetchOptions
): Promise<Response> {
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

  let response: Response;
  try {
    response = await fetch(input, { ...init, signal: combinedSignal });
  } catch (cause) {
    if (timeoutSignal.aborted) {
      throw new SourceFetchError(source, 'timeout', `${source} reageerde niet binnen ${timeoutMs} ms`, undefined, { cause });
    }
    throw new SourceFetchError(source, 'network', `${source} kon niet worden bereikt`, undefined, { cause });
  }

  if (!response.ok) {
    throw new SourceFetchError(source, 'http', `${source} antwoordde met ${response.status}`, response.status);
  }
  return response;
}

export async function fetchSourceJson<T>(
  input: string | URL,
  options: SourceFetchOptions
): Promise<T> {
  const response = await fetchSource(input, options);
  try {
    return await response.json() as T;
  } catch (cause) {
    throw new SourceFetchError(options.source, 'invalid-response', `${options.source} gaf geen geldige JSON terug`, response.status, { cause });
  }
}
