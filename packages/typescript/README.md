# @community-jlcpcb/client

Zero-dependency JLCPCB OpenAPI client. Uses `fetch` and Web Crypto, so the same code runs in browsers, Node 18+, and Cloudflare Workers.

```ts
import { JLCPCBClient } from "@community-jlcpcb/client";

const client = JLCPCBClient.fromEnv();
const quote = await client.pcb.quote({
  orderType: 1,
  fileKey: "gerber-file-key",
  pcbParam: { layer: 2, qty: 5, thickness: 1.6 },
});
quote.raiseForStatus();
```

Uploads take a `Blob`, `File`, `ArrayBuffer`, or `Uint8Array` plus a file name. The signed body is the `meta` JSON field, matching the community Python client.

Privacy fields use RSA-OAEP with SHA-1 and the `{encrypted}` prefix. PKCS#1 v1.5 is not available in Web Crypto.
