import { describe, expect, test } from "bun:test";
import { JLCAuth } from "../src/auth.ts";
import { compactJson } from "../src/json.ts";
import { JLCBusinessError } from "../src/errors.ts";
import { JLCPCBClient } from "../src/client.ts";

const SAMPLE = {
  appId: "293992070061998081",
  accessKey: "b6713a535d56412f805afadd7e818455",
  secretKey: "z0BWlikshimuyiwBsH1i2qwnzMb3j3kA",
  method: "POST",
  url: "https://open.jlcpcb.com/order/v1/createOrder",
  body: '{"goodsId":100,"quantity":52,"createdTime":"2024-03-21 10:03:20"}',
  nonce: "IZHEJYNIHYZIE8S0LLC0VWTPJVRRTO50",
  timestamp: 1625208260,
  header:
    'JOP appid="293992070061998081",accesskey="b6713a535d56412f805afadd7e818455",timestamp="1625208260",nonce="IZHEJYNIHYZIE8S0LLC0VWTPJVRRTO50",signature="sygwKhKBkLwHVv0c7D+a/A7JTEJjGH/kLugFKh16918="',
};

describe("auth", () => {
  test("authorization header matches the official sample", async () => {
    const auth = new JLCAuth(SAMPLE);
    const header = await auth.buildAuthorizationHeader(SAMPLE);
    expect(header).toBe(SAMPLE.header);
  });

  test("context path is stripped from the signed URI", async () => {
    const auth = new JLCAuth({
      ...SAMPLE,
      contextPath: "/api",
    });
    const header = await auth.buildAuthorizationHeader({
      ...SAMPLE,
      url: "https://open.jlcpcb.com/api/order/v1/createOrder",
    });
    expect(header).toBe(SAMPLE.header);
  });
});

describe("json", () => {
  test("omits null fields and keeps nested keys", () => {
    expect(
      compactJson({
        fileKey: "file-key",
        orderType: 1,
        billingAddress: null,
        shippingAddress: { firstName: "Ada", country: "US", city: undefined },
        pcbParam: { layer: 2, qty: 5, rowSpacing: 0.25 },
      }),
    ).toBe(
      '{"fileKey":"file-key","orderType":1,"shippingAddress":{"firstName":"Ada","country":"US"},"pcbParam":{"layer":2,"qty":5,"rowSpacing":0.25}}',
    );
  });
});

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      "J-Trace-ID": "trace-123",
    },
  });
}

describe("client", () => {
  test("GET steel price config signs an empty body", async () => {
    let captured: { url: string; method: string; authorization: string; contentType: string | null } | undefined;
    const client = new JLCPCBClient({
      appId: "app",
      accessKey: "ak",
      secretKey: "sk",
      fetch: async (input, init) => {
        const headers = new Headers(init?.headers);
        captured = {
          url: String(input),
          method: init?.method ?? "GET",
          authorization: headers.get("Authorization") ?? "",
          contentType: headers.get("Content-Type"),
        };
        return jsonResponse({ code: 200, message: "ok", data: [] });
      },
    });

    const result = await client.pcb.getSteelPriceConfig();
    expect(result.isSuccessful).toBe(true);
    expect(result.requestId).toBe("trace-123");
    expect(captured?.method).toBe("GET");
    expect(captured?.url).toBe("https://open.jlcpcb.com/overseas/openapi/pcb/getSteelPriceConfig");
    expect(captured?.contentType).toBe("application/json");
    expect(captured?.authorization.startsWith('JOP appid="app",accesskey="ak",')).toBe(true);
  });

  test("POST signs the compact body that is sent", async () => {
    let body = "";
    let authorization = "";
    const client = new JLCPCBClient({
      appId: SAMPLE.appId,
      accessKey: SAMPLE.accessKey,
      secretKey: SAMPLE.secretKey,
      fetch: async (_input, init) => {
        body = String(init?.body);
        authorization = new Headers(init?.headers).get("Authorization") ?? "";
        return jsonResponse({ code: 200, message: "ok", data: [{ componentCode: "C2040" }] });
      },
    });

    const result = await client.components.getDetailsByCode({ componentCodes: ["C2040"] });
    expect(body).toBe('{"componentCodes":["C2040"]}');
    const expected = await client.auth.buildAuthorizationHeader({
      method: "POST",
      url: "https://open.jlcpcb.com/overseas/openapi/component/getComponentDetailByCode",
      body,
      nonce: authorization.match(/nonce="([^"]+)"/)?.[1],
      timestamp: Number(authorization.match(/timestamp="([^"]+)"/)?.[1]),
    });
    expect(authorization).toBe(expected);
    expect(result.data).toEqual([{ componentCode: "C2040" }]);
  });

  test("upload sends meta and file and signs meta", async () => {
    let meta = "";
    let fileName = "";
    let signed = "";
    const client = new JLCPCBClient({
      appId: "app",
      accessKey: "ak",
      secretKey: "sk",
      fetch: async (_input, init) => {
        const form = init?.body as FormData;
        meta = String(form.get("meta"));
        const file = form.get("file");
        fileName = file instanceof File ? file.name : "";
        signed = new Headers(init?.headers).get("Authorization") ?? "";
        expect(new Headers(init?.headers).has("Content-Type")).toBe(false);
        return jsonResponse({ code: 200, message: "ok", data: "file-key" });
      },
    });

    const result = await client.pcb.uploadGerber({
      file: new Uint8Array([1, 2, 3]),
      fileName: "board.zip",
    });
    expect(result.data).toBe("file-key");
    expect(meta).toBe("{}");
    expect(fileName).toBe("board.zip");
    expect(signed.startsWith('JOP appid="app",accesskey="ak",')).toBe(true);
  });

  test("raiseForStatus throws the business code", async () => {
    const client = new JLCPCBClient({
      appId: "app",
      accessKey: "ak",
      secretKey: "sk",
      fetch: async () =>
        jsonResponse({ code: 403, message: "API insufficient permissions, access denied" }, 403),
    });
    const result = await client.components.listLibrary();
    expect(result.ok).toBe(false);
    expect(() => result.raiseForStatus()).toThrow(JLCBusinessError);
  });
});

describe("privacy", () => {
  test("round-trips RSA-OAEP SHA-1", async () => {
    const pair = await crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-1",
      },
      true,
      ["encrypt", "decrypt"],
    );
    const publicDer = new Uint8Array(await crypto.subtle.exportKey("spki", pair.publicKey));
    const privateDer = new Uint8Array(await crypto.subtle.exportKey("pkcs8", pair.privateKey));
    const { bytesToBase64 } = await import("../src/auth.ts");
    const auth = new JLCAuth({
      appId: "app",
      accessKey: "ak",
      secretKey: "sk",
      rsaPublicKey: bytesToBase64(publicDer),
      rsaPrivateKey: bytesToBase64(privateDer),
    });
    const cipher = await auth.encryptPrivacy("Ada Lovelace");
    expect(cipher.startsWith("{encrypted}")).toBe(true);
    expect(await auth.decryptPrivacy(cipher)).toBe("Ada Lovelace");
    expect(await auth.encryptPrivacy("  ")).toBe("  ");
    expect(await auth.decryptPrivacy("plain")).toBe("plain");
  });
});
