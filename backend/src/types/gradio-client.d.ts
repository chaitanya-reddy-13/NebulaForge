declare module '@gradio/client' {
  type HuggingFaceToken = `hf_${string}` | string;

  export interface ClientPredictResult<T = unknown> {
    data: T;
    // Allow arbitrary extra metadata from the API
    [key: string]: unknown;
  }

  export interface ClientConnectOptions {
    token?: HuggingFaceToken;
  }

  export class Client {
    static connect(space: string, options?: ClientConnectOptions): Promise<Client>;
    predict<R = unknown>(
      endpoint: string,
      payload: Record<string, unknown>
    ): Promise<ClientPredictResult<R>>;
  }
}


