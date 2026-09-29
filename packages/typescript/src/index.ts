export { JLCAuth, buildStringToSign, canonicalUri, generateNonce, hmacSha256Base64 } from "./auth.js";
export type { JLCAuthOptions, SignInput } from "./auth.js";
export { ComponentApi, JLCPCBClient, PcbApi, StencilApi, TdpApi } from "./client.js";
export type { EnvSource, JLCPCBClientOptions, RequestOptions, UploadOptions } from "./client.js";
export { DEFAULT_ENDPOINT, endpoints, unresolvedEndpoints } from "./endpoints.js";
export { JLCBusinessError, JLCError, JLCProtocolError, JLCTransportError } from "./errors.js";
export { compactJson, toPayload } from "./json.js";
export { PARTS_CATALOG_URL, searchParts } from "./parts.js";
export type { PartHit, PartsSearchOptions, PartsSearchRequest } from "./parts.js";
export { ApiResponse } from "./response.js";
export type {
  BatchNumRequest,
  ComponentCodesRequest,
  ComponentInfosRequest,
  CraftAttributeShoppingCart,
  CraftShoppingCart,
  CustomerAddress,
  FileData,
  ImpedanceTemplateRequest,
  OrderAddressData,
  PageRequest,
  PcbAuditRequest,
  PcbBlindViaHoleData,
  PcbCreateOrderRequest,
  PcbOrderCraftData,
  PcbOrderServiceCraftData,
  PcbQuoteRequest,
  PcbWipRequest,
  SerialQrCodeConfigData,
  SteelOrderCraftData,
  TdpCreateOrderRequest,
  TdpFileResultRequest,
  TdpOrderListRequest,
  TdpOrderProcessRequest,
  TdpQuoteRequest,
  UploadInput,
} from "./types.js";
