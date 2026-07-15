export class GatewayError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = "GatewayError";
  }
}
