# community_jlcpcb_api_client

Multi-language clients for the [JLCPCB API Platform](https://api.jlcpcb.com/).

The developer portal is `https://api.jlcpcb.com/`. Signed calls go to `https://open.jlcpcb.com`.

| SDK | Language | Where | Status |
| --- | --- | --- | --- |
| [i2cjak/jlcpcb_api](https://github.com/i2cjak/jlcpcb_api) | Python | `external/python` (git submodule) | community, external |
| `@community-jlcpcb/client` | TypeScript | `packages/typescript` | first-party, browser / Node / Workers |
| Official Java SDK | Java | API console download | official, not vendored |

Catalog: [`sdks.json`](sdks.json).

## External Python SDK

```bash
git submodule update --init --recursive
cd external/python
uv sync
```

That checkout is the upstream repo. Do not copy it into a first-party package.

## TypeScript SDK

```bash
bun install
bun test
bun run typecheck
```

```ts
import { JLCPCBClient } from "@community-jlcpcb/client";

const client = new JLCPCBClient({
  appId: process.env.JLCPCB_APP_ID!,
  accessKey: process.env.JLCPCB_ACCESS_KEY!,
  secretKey: process.env.JLCPCB_SECRET_KEY!,
});

const parts = await client.components.getDetailsByCode({
  componentCodes: ["C2040"],
});
parts.raiseForStatus();

const found = await JLCPCBClient.searchParts({ keyword: "10k 0603" });
found.raiseForStatus();
```

`searchParts` posts to the public parts catalog. It does not use app credentials, does not sign the request, and does not place an order. LCSC codes still use `components.getDetailsByCode`.

Credentials come from an app on the API portal (`appId`, `accessKey`, `secretKey`). Business success is HTTP 200 and `code === 200`. A 403 with `API insufficient permissions` means the app exists but that API scope is not enabled.

Do not ship `secretKey` in a public browser bundle. Browser support is for extensions, local tools, and other contexts that can hold the key. Workers should read secrets from bindings via `JLCPCBClient.fromEnv({ env })`.

The portal lists **Get Available Balance** and **Get Available Plate Brand & TG Value Combinations**, but neither path is in the published Java/Python SDKs. Call them with `client.request({ uri, body })` once the URI is known. Do not guess paths: a wrong path returns `401 API not exists`.
