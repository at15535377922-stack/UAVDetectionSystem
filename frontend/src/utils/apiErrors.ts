/**
 * Global API error event bus.
 * Allows the axios interceptor (non-React) to emit errors
 * that the Toast system (React) can listen to.
 */

type ErrorHandler = (message: string, status?: number) => void

let _handler: ErrorHandler | null = null

export function setGlobalErrorHandler(handler: ErrorHandler) {
  _handler = handler
}

export function emitApiError(message: string, status?: number) {
  if (_handler) {
    _handler(message, status)
  }
}
