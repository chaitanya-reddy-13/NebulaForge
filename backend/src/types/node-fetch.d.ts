declare module 'node-fetch' {
  type BodyType = Buffer | string | ArrayBuffer | ArrayBufferView | URLSearchParams | FormData | null;
  type HeadersInit = Record<string, string> | Iterable<[string, string]>;

  interface RequestInit {
    method?: string;
    headers?: HeadersInit;
    body?: BodyType;
    signal?: AbortSignal | null;
    redirect?: 'follow' | 'manual' | 'error';
    follow?: number;
    timeout?: number;
    size?: number;
    // Allow any additional vendor-specific options
    [key: string]: unknown;
  }

  interface Response {
    readonly ok: boolean;
    readonly status: number;
    readonly statusText: string;
    readonly headers: Headers;
    arrayBuffer(): Promise<ArrayBuffer>;
    json(): Promise<unknown>;
    text(): Promise<string>;
  }

  interface Request {
    readonly url: string;
    readonly method: string;
    readonly headers: Headers;
  }

  interface Headers {
    append(name: string, value: string): void;
    delete(name: string): void;
    get(name: string): string | null;
    has(name: string): boolean;
    set(name: string, value: string): void;
    forEach(callback: (value: string, name: string) => void): void;
  }

  type FetchFn = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

  const fetch: FetchFn;
  export default fetch;

  export { Headers, Request, Response, RequestInit };
}


