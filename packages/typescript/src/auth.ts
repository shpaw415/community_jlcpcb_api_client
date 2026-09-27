import { DEFAULT_ENDPOINT } from "./endpoints.js";

const NONCE_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const ENCRYPTED_PREFIX = "{encrypted}";

export interface JLCAuthOptions {
  appId: string;
  accessKey: string;
  secretKey: string;
  endpoint?: string;
  contextPath?: string;
  rsaPublicKey?: string;
  rsaPrivateKey?: string;
}

export interface SignInput {
  method: string;
  url: string;
  body?: string;
  nonce?: string;
  timestamp?: number;
}

export function generateNonce(length = 32): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let nonce = "";
  for (const byte of bytes) {
    nonce += NONCE_ALPHABET[byte % NONCE_ALPHABET.length];
  }
  return nonce;
}

export function canonicalUri(url: string, contextPath?: string): string {
  const parsed = new URL(url);
  let uri = parsed.pathname;
  if (parsed.search) uri += parsed.search;
  if (contextPath && uri.startsWith(contextPath)) {
    uri = uri.slice(contextPath.length);
  }
  return uri;
}

export function buildStringToSign(
  method: string,
  uri: string,
  timestamp: number | string,
  nonce: string,
  body: string,
): string {
  return `${method.toUpperCase()}\n${uri}\n${timestamp}\n${nonce}\n${body}\n`;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export async function hmacSha256Base64(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return bytesToBase64(new Uint8Array(signature));
}

function pemToDer(material: string): Uint8Array<ArrayBuffer> {
  const body = material.includes("BEGIN")
    ? material.replace(/-----BEGIN [^-]+-----/g, "").replace(/-----END [^-]+-----/g, "")
    : material;
  return base64ToBytes(body.replace(/\s+/g, ""));
}

export class JLCAuth {
  readonly appId: string;
  readonly accessKey: string;
  readonly secretKey: string;
  readonly endpoint: string;
  readonly contextPath?: string;
  readonly rsaPublicKey?: string;
  readonly rsaPrivateKey?: string;

  constructor(options: JLCAuthOptions) {
    this.appId = options.appId;
    this.accessKey = options.accessKey;
    this.secretKey = options.secretKey;
    this.endpoint = (options.endpoint ?? DEFAULT_ENDPOINT).replace(/\/+$/, "");
    this.contextPath = options.contextPath;
    this.rsaPublicKey = options.rsaPublicKey;
    this.rsaPrivateKey = options.rsaPrivateKey;
  }

  async buildAuthorizationHeader(input: SignInput): Promise<string> {
    const nonce = input.nonce ?? generateNonce();
    const timestamp = input.timestamp ?? Math.floor(Date.now() / 1000);
    const uri = canonicalUri(input.url, this.contextPath);
    const stringToSign = buildStringToSign(
      input.method,
      uri,
      timestamp,
      nonce,
      input.body ?? "",
    );
    const signature = await hmacSha256Base64(this.secretKey, stringToSign);
    return (
      `JOP appid="${this.appId}",` +
      `accesskey="${this.accessKey}",` +
      `timestamp="${timestamp}",` +
      `nonce="${nonce}",` +
      `signature="${signature}"`
    );
  }

  async encryptPrivacy(plainText: string): Promise<string> {
    if (plainText.trim() === "") return plainText;
    if (!this.rsaPublicKey) {
      throw new Error("rsaPublicKey is required for privacy encryption");
    }
    const key = await crypto.subtle.importKey(
      "spki",
      pemToDer(this.rsaPublicKey),
      { name: "RSA-OAEP", hash: "SHA-1" },
      false,
      ["encrypt"],
    );
    const encrypted = await crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      key,
      new TextEncoder().encode(plainText),
    );
    return ENCRYPTED_PREFIX + bytesToBase64(new Uint8Array(encrypted));
  }

  async decryptPrivacy(cipherText: string): Promise<string> {
    if (cipherText.trim() === "") return cipherText;
    if (!cipherText.startsWith(ENCRYPTED_PREFIX)) return cipherText;
    if (!this.rsaPrivateKey) {
      throw new Error("rsaPrivateKey is required for privacy decryption");
    }
    const key = await crypto.subtle.importKey(
      "pkcs8",
      pemToDer(this.rsaPrivateKey),
      { name: "RSA-OAEP", hash: "SHA-1" },
      false,
      ["decrypt"],
    );
    const decrypted = await crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      key,
      base64ToBytes(cipherText.slice(ENCRYPTED_PREFIX.length)),
    );
    return new TextDecoder().decode(decrypted);
  }
}
