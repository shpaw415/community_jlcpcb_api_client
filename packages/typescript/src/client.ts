import { JLCAuth, type JLCAuthOptions } from "./auth.js";
import { endpoints } from "./endpoints.js";
import { JLCError, JLCProtocolError, JLCTransportError } from "./errors.js";
import { compactJson } from "./json.js";
import { searchParts, type PartHit, type PartsSearchOptions, type PartsSearchRequest } from "./parts.js";
import { ApiResponse } from "./response.js";
import type {
  BatchNumRequest,
  ComponentCodesRequest,
  ComponentInfosRequest,
  ImpedanceTemplateRequest,
  PageRequest,
  PcbAuditRequest,
  PcbCreateOrderRequest,
  PcbQuoteRequest,
  PcbWipRequest,
  TdpCreateOrderRequest,
  TdpFileResultRequest,
  TdpOrderListRequest,
  TdpOrderProcessRequest,
  TdpQuoteRequest,
  UploadInput,
} from "./types.js";

export interface EnvSource {
  [key: string]: string | undefined;
}

export interface JLCPCBClientOptions extends JLCAuthOptions {
  timeoutMs?: number;
  fetch?: typeof fetch;
}

export interface RequestOptions {
  method?: "GET" | "POST";
  uri: string;
  body?: unknown;
  timeoutMs?: number;
}

export interface UploadOptions extends UploadInput {
  uri: string;
  timeoutMs?: number;
}

const JSON_TIMEOUT_MS = 30_000;
const UPLOAD_TIMEOUT_MS = 120_000;

function defaultEnv(): EnvSource {
  const proc = (globalThis as { process?: { env?: EnvSource } }).process;
  return proc?.env ?? {};
}

function unescapeEnv(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (value.includes("\\n") && !value.includes("\n")) return value.replace(/\\n/g, "\n");
  return value;
}

function requireEnv(env: EnvSource, name: string): string {
  const value = env[name];
  if (!value) throw new JLCError(`missing env var: ${name}`);
  return value;
}

function timeoutSignal(ms: number): AbortSignal {
  if (typeof AbortSignal !== "undefined" && "timeout" in AbortSignal) {
    return AbortSignal.timeout(ms);
  }
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

function joinUrl(endpoint: string, uri: string, query?: Record<string, unknown>): string {
  const path = uri.startsWith("/") ? uri : `/${uri}`;
  const url = new URL(`${endpoint}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || typeof value === "object") continue;
      url.searchParams.append(key, String(value));
    }
  }
  return url.toString();
}

function toBlob(file: Blob | ArrayBuffer | Uint8Array, contentType?: string): Blob {
  if (file instanceof Blob) return file;
  const type = contentType ?? "application/octet-stream";
  if (file instanceof ArrayBuffer) return new Blob([file], { type });
  const copy = new Uint8Array(file.byteLength);
  copy.set(file);
  return new Blob([copy], { type });
}

function fileNameOf(input: UploadInput): string {
  if (input.fileName) return input.fileName;
  if (typeof File !== "undefined" && input.file instanceof File && input.file.name) {
    return input.file.name;
  }
  throw new JLCError("fileName is required when file is not a File");
}

export class JLCPCBClient {
  readonly auth: JLCAuth;
  readonly pcb: PcbApi;
  readonly components: ComponentApi;
  readonly stencil: StencilApi;
  readonly tdp: TdpApi;
  readonly timeoutMs: number;
  readonly fetch: typeof fetch;

  constructor(options: JLCPCBClientOptions) {
    this.auth = new JLCAuth(options);
    this.timeoutMs = options.timeoutMs ?? JSON_TIMEOUT_MS;
    this.fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.pcb = new PcbApi(this);
    this.components = new ComponentApi(this);
    this.stencil = new StencilApi(this);
    this.tdp = new TdpApi(this);
  }

  static searchParts(
    body: PartsSearchRequest,
    options?: PartsSearchOptions,
  ): Promise<ApiResponse<PartHit[]>> {
    return searchParts(body, options);
  }

  static fromEnv(options?: {
    prefix?: string;
    env?: EnvSource;
    fetch?: typeof fetch;
    timeoutMs?: number;
  }): JLCPCBClient {
    const prefix = options?.prefix ?? "JLCPCB_";
    const env = options?.env ?? defaultEnv();
    return new JLCPCBClient({
      appId: requireEnv(env, `${prefix}APP_ID`),
      accessKey: requireEnv(env, `${prefix}ACCESS_KEY`),
      secretKey: requireEnv(env, `${prefix}SECRET_KEY`),
      endpoint: env[`${prefix}ENDPOINT`],
      contextPath: env[`${prefix}CONTEXT_PATH`],
      rsaPublicKey: unescapeEnv(env[`${prefix}RSA_PUBLIC_KEY`]),
      rsaPrivateKey: unescapeEnv(env[`${prefix}RSA_PRIVATE_KEY`]),
      fetch: options?.fetch,
      timeoutMs: options?.timeoutMs,
    });
  }

  request<T = unknown>(options: RequestOptions): Promise<ApiResponse<T>> {
    const method = options.method ?? "POST";
    const body = method === "GET" ? "" : compactJson(options.body ?? {});
    const query =
      method === "GET" && options.body && typeof options.body === "object" && !Array.isArray(options.body)
        ? (options.body as Record<string, unknown>)
        : undefined;
    const url = joinUrl(this.auth.endpoint, options.uri, query);
    return this.dispatch<T>(url, method, body, options.timeoutMs ?? this.timeoutMs, {
      "Content-Type": "application/json",
    });
  }

  upload<T = unknown>(options: UploadOptions): Promise<ApiResponse<T>> {
    const meta = compactJson(options.meta ?? {});
    const fileName = fileNameOf(options);
    const blob = toBlob(options.file, options.contentType);
    const form = new FormData();
    form.append("meta", meta);
    form.append("file", blob, fileName);
    const url = joinUrl(this.auth.endpoint, options.uri);
    return this.dispatch<T>(url, "POST", meta, options.timeoutMs ?? UPLOAD_TIMEOUT_MS, undefined, form);
  }

  private async dispatch<T>(
    url: string,
    method: "GET" | "POST",
    signedBody: string,
    timeoutMs: number,
    extraHeaders: Record<string, string> | undefined,
    body?: BodyInit,
  ): Promise<ApiResponse<T>> {
    const authorization = await this.auth.buildAuthorizationHeader({
      method,
      url,
      body: signedBody,
    });
    const headers = new Headers({
      Accept: "application/json",
      Authorization: authorization,
      ...extraHeaders,
    });
    const wireBody = method === "GET" ? undefined : (body ?? signedBody);
    let response: Response;
    try {
      response = await this.fetch(url, {
        method,
        headers,
        body: wireBody,
        signal: timeoutSignal(timeoutMs),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new JLCTransportError(message, { cause: error });
    }
    return parseResponse<T>(response);
  }
}

async function parseResponse<T>(response: Response): Promise<ApiResponse<T>> {
  const requestId = response.headers.get("J-Trace-ID");
  const contentType = response.headers.get("Content-Type") ?? "";
  const rawText = await response.text();
  let payload: unknown = null;
  if (rawText) {
    try {
      payload = JSON.parse(rawText) as unknown;
    } catch (error) {
      if (contentType.toLowerCase().includes("application/json")) {
        throw new JLCProtocolError("response declared JSON but could not be decoded");
      }
      payload = null;
      void error;
    }
  }
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const record = payload as Record<string, unknown>;
    const code = Number(record.code ?? response.status);
    const message = String(record.message ?? response.statusText);
    return new ApiResponse<T>(
      code,
      message,
      (record.data ?? null) as T | null,
      response.status,
      requestId,
      response.headers,
      payload,
    );
  }
  return new ApiResponse<T>(
    response.status,
    rawText || response.statusText,
    null,
    response.status,
    requestId,
    response.headers,
    payload ?? rawText,
  );
}

export class PcbApi {
  constructor(private readonly client: JLCPCBClient) {}

  uploadGerber(input: UploadInput): Promise<ApiResponse<string>> {
    return this.client.upload({ uri: endpoints.pcb.uploadGerber, ...input });
  }

  uploadBlindViaHoleImage(input: UploadInput): Promise<ApiResponse<string>> {
    return this.client.upload({ uri: endpoints.pcb.uploadBlindViaHoleImg, ...input });
  }

  listImpedanceTemplates(body: ImpedanceTemplateRequest = {}): Promise<ApiResponse<unknown[]>> {
    return this.client.request({ uri: endpoints.pcb.impedanceTemplates, body });
  }

  quote(body: PcbQuoteRequest): Promise<ApiResponse<Record<string, unknown>>> {
    return this.client.request({ uri: endpoints.pcb.quote, body });
  }

  createOrder(body: PcbCreateOrderRequest): Promise<ApiResponse<Record<string, unknown>>> {
    return this.client.request({ uri: endpoints.pcb.createOrder, body });
  }

  getProductionProgress(body: PcbWipRequest): Promise<ApiResponse<unknown[]>> {
    return this.client.request({ uri: endpoints.pcb.productionProgress, body });
  }

  getOrderDetail(body: BatchNumRequest): Promise<ApiResponse<Record<string, unknown>>> {
    return this.client.request({ uri: endpoints.pcb.orderDetail, body });
  }

  getAudit(body: PcbAuditRequest): Promise<ApiResponse<Record<string, unknown>>> {
    return this.client.request({ uri: endpoints.pcb.audit, body });
  }

  getSteelPriceConfig(): Promise<ApiResponse<unknown[]>> {
    return this.client.request({ method: "GET", uri: endpoints.pcb.steelPriceConfig });
  }
}

export class ComponentApi {
  constructor(private readonly client: JLCPCBClient) {}

  getInfos(body: ComponentInfosRequest = {}): Promise<ApiResponse<Record<string, unknown>>> {
    return this.client.request({ uri: endpoints.components.infos, body });
  }

  listLibrary(body: PageRequest = { currentPage: 1, pageSize: 30 }): Promise<ApiResponse<unknown[]>> {
    return this.client.request({ uri: endpoints.components.libraryList, body });
  }

  listPrivateLibrary(body: PageRequest = { currentPage: 1, pageSize: 30 }): Promise<ApiResponse<unknown[]>> {
    return this.client.request({ uri: endpoints.components.privateLibrary, body });
  }

  getDetailsByCode(body: ComponentCodesRequest): Promise<ApiResponse<unknown[]>> {
    return this.client.request({ uri: endpoints.components.detailByCode, body });
  }
}

export class StencilApi {
  constructor(private readonly client: JLCPCBClient) {}

  getPriceConfig(): Promise<ApiResponse<unknown[]>> {
    return this.client.pcb.getSteelPriceConfig();
  }
}

export class TdpApi {
  constructor(private readonly client: JLCPCBClient) {}

  uploadFile(input: UploadInput): Promise<ApiResponse<Record<string, unknown>>> {
    return this.client.upload({ uri: endpoints.tdp.upload, ...input });
  }

  getFileAnalysis(body: TdpFileResultRequest): Promise<ApiResponse<Record<string, unknown>>> {
    return this.client.request({ uri: endpoints.tdp.fileResult, body });
  }

  quote(body: TdpQuoteRequest): Promise<ApiResponse<Record<string, unknown>>> {
    return this.client.request({ uri: endpoints.tdp.quote, body });
  }

  createOrder(body: TdpCreateOrderRequest): Promise<ApiResponse<Record<string, unknown>>> {
    return this.client.request({ uri: endpoints.tdp.createOrder, body });
  }

  listOrders(body: TdpOrderListRequest = {}): Promise<ApiResponse<Record<string, unknown>>> {
    return this.client.request({ uri: endpoints.tdp.orderList, body });
  }

  getOrderDetail(body: BatchNumRequest): Promise<ApiResponse<Record<string, unknown>>> {
    return this.client.request({ uri: endpoints.tdp.orderDetail, body });
  }

  getOrderProcess(body: TdpOrderProcessRequest): Promise<ApiResponse<unknown[]>> {
    return this.client.request({ uri: endpoints.tdp.orderProcess, body });
  }
}
