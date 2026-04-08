import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errors: any[] = [{ message: 'Internal server error' }];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        errors = [{ message: exceptionResponse }];
      } else if (typeof exceptionResponse === 'object') {
        const resp = exceptionResponse as any;
        if (Array.isArray(resp.message)) {
          errors = resp.message.map((msg: string) => ({ message: msg }));
        } else {
          errors = [{ message: resp.message || exception.message }];
        }
      }
    }

    response.status(status).json({
      data: null,
      meta: null,
      errors,
    });
  }
}
