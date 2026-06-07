export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public code?: string, // machine-readable e.g. 'INSUFFICIENT_CREDITS'
    public details?: unknown // Zod errors, etc.
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype); // restore prototype chain
    Error.captureStackTrace(this, this.constructor);
  }
}
