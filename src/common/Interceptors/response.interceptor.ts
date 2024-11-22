import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { SuccessResponse } from '../responses/success-response';
import { ErrorResponse } from '../responses/error-response';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        if (data instanceof ErrorResponse) {
          return {
            statusCode: data.statusCode,
            error: data.errorMessage,
          }; // Let Nest handle sending this as the response
        } else if (data instanceof SuccessResponse) {
          return {
            statusCode: data.statusCode,
            message: data.message,
            data: data.data,
          }; // Let Nest handle sending this as the response
        }
        return data; // For any unknown type, return as is
      }),
      catchError((err) => {
        // Pass errors to the global exception handler
        throw err;
      }),
    );
  }
}
