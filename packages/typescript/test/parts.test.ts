import { describe, expect, test } from "bun:test";
import { JLCBusinessError, JLCError, JLCTransportError } from "../src/errors.ts";
import { JLCPCBClient } from "../src/client.ts";
import { PARTS_CATALOG_URL, searchParts } from "../src/parts.ts";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("searchParts", () => {
  test("posts the public catalog and does not sign", async () => {
    let url = "";
    let method = "";
    let body = "";
    let authorization: string | null = null;
    const result = await searchParts(
      { keyword: " 10k 0603 ", pageSize: 500 },
      {
        fetch: async (input, init) => {
          url = String(input);
          method = init?.method ?? "";
          body = String(init?.body);
          authorization = new Headers(init?.headers).get("Authorization");
          return jsonResponse({
            code: 200,
            message: "ok",
            data: {
              componentPageInfo: {
                list: [
                  {
                    componentCode: "C2040",
                    componentName: "10k",
                    componentSpecificationEn: "0603",
                    stockCount: 4,
                    componentPrices: [{ productPrice: 0.01 }],
                  },
                ],
              },
            },
          });
        },
      },
    );
    expect(url).toBe(PARTS_CATALOG_URL);
    expect(url).not.toContain("open.jlcpcb.com");
    expect(method).toBe("POST");
    expect(authorization).toBeNull();
    expect(body).toBe('{"keyword":"10k 0603","currentPage":1,"pageSize":100}');
    expect(result.data).toEqual([
      { componentCode: "C2040", name: "10k", package: "0603", stock: 4, price: 0.01 },
    ]);
    expect(result.raw).toMatchObject({ code: 200 });
  });

  test("rejects an empty keyword before fetch", async () => {
    let called = 0;
    await expect(
      searchParts(
        { keyword: "  " },
        {
          fetch: async () => {
            called += 1;
            return jsonResponse({ code: 200, data: [] });
          },
        },
      ),
    ).rejects.toThrow(JLCError);
    expect(called).toBe(0);
  });

  test("raiseForStatus throws when the catalog code is not 200", async () => {
    const result = await JLCPCBClient.searchParts(
      { keyword: "stm32" },
      {
        fetch: async () => jsonResponse({ code: 500, message: "busy", data: null }, 200),
      },
    );
    expect(result.ok).toBe(false);
    expect(() => result.raiseForStatus()).toThrow(JLCBusinessError);
  });

  test("wraps a failed fetch", async () => {
    await expect(
      searchParts(
        { keyword: "led" },
        {
          fetch: async () => {
            throw new Error("offline");
          },
        },
      ),
    ).rejects.toThrow(JLCTransportError);
  });
});
