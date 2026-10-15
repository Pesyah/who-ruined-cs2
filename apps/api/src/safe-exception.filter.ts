import { ArgumentsHost, Catch, HttpException, HttpStatus, type ExceptionFilter } from '@nestjs/common';
import type { Response } from 'express';
import { randomUUID } from 'node:crypto';

export class ApiError extends HttpException {
  constructor(public readonly code: string, message: string, status: number, public readonly details?: Record<string, unknown>) { super(message, status); }
}

@Catch()
export class SafeExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const requestId = randomUUID();
    if (exception instanceof ApiError) {
      response.status(exception.getStatus()).json({ error: { code: exception.code, message: exception.message, ...(exception.details ? { details: exception.details } : {}) }, requestId });
      return;
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      response.status(status).json({ error: { code: status === HttpStatus.PAYLOAD_TOO_LARGE ? 'SIZE_LIMIT' : 'INVALID_DEMO', message: exception.message }, requestId });
      return;
    }
    console.error(JSON.stringify({ level: 'error', requestId, message: exception instanceof Error ? exception.message : 'Unknown error' }));
    response.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Внутренняя ошибка сервера.' }, requestId });
  }
}
