import { JLCError, JLCProtocolError, JLCTransportError } from "./errors.js";
import { compactJson } from "./json.js";
import { ApiResponse } from "./response.js";

export const PARTS_CATALOG_URL =
  "https://jlcpcb.com/api/overseas-pcb-order/v1/shoppingCart/smtGood/selectSmtComponentList";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const MAX_PAGE = 1000;
const MAX_KEYWORD = 200;
const TIMEOUT_MS = 30_000;

export interface PartsSearchRequest {
  keyword: string;
  currentPage?: number;
  pageSize?: number;
}

export interface PartsSearchOptions {
  fetch?: typeof fetch;
  timeoutMs?: number;
}

export interface PartHit {
  componentCode: string;
  name?: string;
  package?: string;
  stock?: string | number;
  price?: string | number;
}

export async function searchParts(
  body: PartsSearchRequest,
  options?: PartsSearchOptions,
): Promise<ApiResponse<PartHit[]>> {
  const keyword = body.keyword.trim();
  if (!keyword || keyword.length > MAX_KEYWORD) {
    throw new JLCError("keyword is required");
  }
  const currentPage = bounded(body.currentPage, 1, MAX_PAGE, "currentPage is invalid");
  const pageSize = bounded(body.pageSize, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, "pageSize is invalid");
  const fetchImpl = options?.fetch ?? globalThis.fetch.bind(globalThis);
  const payload = compactJson({ keyword, currentPage, pageSize });
  let response: Response;
  try {
    response = await fetchImpl(PARTS_CATALOG_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Origin: "https://jlcpcb.com",
        Referer: "https://jlcpcb.com/parts",
      },
      body: payload,
      signal: timeoutSignal(options?.timeoutMs ?? TIMEOUT_MS),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new JLCTransportError(message, { cause: error });
  }
  return parseCatalog(response);
}

function bounded(value: number | undefined, fallback: number, max: number, message: string): number {
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || value < 1) throw new JLCError(message);
  return Math.min(value, max);
}

function timeoutSignal(ms: number): AbortSignal {
  if (typeof AbortSignal !== "undefined" && "timeout" in AbortSignal) {
    return AbortSignal.timeout(ms);
  }
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

async function parseCatalog(response: Response): Promise<ApiResponse<PartHit[]>> {
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
    return new ApiResponse(
      code,
      message,
      catalogList(record.data ?? payload),
      response.status,
      requestId,
      response.headers,
      payload,
    );
  }
  return new ApiResponse<PartHit[]>(
    response.status,
    rawText || response.statusText,
    null,
    response.status,
    requestId,
    response.headers,
    payload ?? rawText,
  );
}

function catalogList(data: unknown): PartHit[] {
  const rows = rowsOf(data);
  const parts: PartHit[] = [];
  for (const row of rows) {
    const part = partFrom(row);
    if (part) parts.push(part);
  }
  return parts;
}

function rowsOf(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== "object") return [];
  const record = data as Record<string, unknown>;
  const page = record.componentPageInfo;
  if (page && typeof page === "object" && !Array.isArray(page)) {
    const list = (page as { list?: unknown }).list;
    if (Array.isArray(list)) return list;
  }
  if (Array.isArray(record.list)) return record.list;
  return [];
}

function partFrom(value: unknown): PartHit | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const componentCode = text(record.componentCode);
  if (!componentCode) return null;
  const part: PartHit = { componentCode };
  const name = text(record.name) ?? text(record.componentName);
  const pack =
    text(record.package) ?? text(record.componentSpecification) ?? text(record.componentSpecificationEn);
  const stock = scalar(record.stock) ?? scalar(record.stockCount);
  const price = priceOf(record);
  if (name) part.name = name;
  if (pack) part.package = pack;
  if (stock !== undefined) part.stock = stock;
  if (price !== undefined) part.price = price;
  return part;
}

function priceOf(record: Record<string, unknown>): string | number | undefined {
  const direct = scalar(record.price) ?? scalar(record.productPrice);
  if (direct !== undefined) return direct;
  if (!Array.isArray(record.componentPrices)) return undefined;
  for (const row of record.componentPrices) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    const price = scalar((row as Record<string, unknown>).productPrice);
    if (price !== undefined) return price;
  }
  return undefined;
}

function text(value: unknown): string | undefined {
  const next = scalar(value);
  return typeof next === "string" ? next : undefined;
}

function scalar(value: unknown): string | number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) return value.trim();
  return undefined;
}
