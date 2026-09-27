export class JLCError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JLCError";
  }
}

export class JLCTransportError extends JLCError {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "JLCTransportError";
    if (options?.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

export class JLCProtocolError extends JLCError {
  constructor(message: string) {
    super(message);
    this.name = "JLCProtocolError";
  }
}

export class JLCBusinessError extends JLCError {
  readonly code: number;
  readonly requestId: string | null;
  readonly status: number | null;

  constructor(
    message: string,
    details: { code: number; requestId?: string | null; status?: number | null },
  ) {
    super(message);
    this.name = "JLCBusinessError";
    this.code = details.code;
    this.requestId = details.requestId ?? null;
    this.status = details.status ?? null;
  }
}
