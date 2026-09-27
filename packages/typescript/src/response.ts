import { JLCBusinessError } from "./errors.js";

export class ApiResponse<T> {
  constructor(
    readonly code: number,
    readonly message: string,
    readonly data: T | null,
    readonly status: number,
    readonly requestId: string | null,
    readonly headers: Headers,
    readonly raw: unknown,
  ) {}

  get ok(): boolean {
    return this.status === 200 && this.code === 200;
  }

  get isSuccessful(): boolean {
    return this.ok;
  }

  raiseForStatus(): void {
    if (this.ok) return;
    throw new JLCBusinessError(this.message, {
      code: this.code,
      requestId: this.requestId,
      status: this.status,
    });
  }
}
