import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "..");

describe("sdk registry", () => {
  test("python is an external submodule, not a vendored copy", () => {
    const registry = JSON.parse(readFileSync(resolve(root, "sdks.json"), "utf8")) as {
      sdks: Array<{ id: string; status: string; path: string; repository: string }>;
    };
    const python = registry.sdks.find((sdk) => sdk.id === "python");
    expect(python?.status).toBe("external");
    expect(python?.repository).toBe("https://github.com/i2cjak/jlcpcb_api");
    expect(existsSync(resolve(root, "external/python/src/jlcpcb_api/client.py"))).toBe(true);
    const modules = readFileSync(resolve(root, ".gitmodules"), "utf8");
    expect(modules).toContain("external/python");
    expect(modules).toContain("https://github.com/i2cjak/jlcpcb_api");
  });
});
