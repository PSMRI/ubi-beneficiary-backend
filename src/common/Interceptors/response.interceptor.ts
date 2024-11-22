import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Response } from 'express';
import { SuccessResponse } from '../responses/success-response';
import { ErrorResponse } from '../responses/error-response';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      map((data) => {
        if (data instanceof ErrorResponse) {
          response.status(data.statusCode).json({
            statusCode: data.statusCode,
            error: data.errorMessage,
          });
        } else if (data instanceof SuccessResponse) {
          response.status(data.statusCode).json({
            statusCode: data.statusCode,
            message: data.message,
            data: data.data,
          });
        } else {
          return data; // For other response types, pass through without modification
        }
      }),
      catchError((err) => {
        throw err; // Re-throw the error to ensure it doesn't get swallowed
      }),
    );
  }
}
