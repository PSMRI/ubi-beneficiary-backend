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
					// Return the formatted error response object
					// Let NestJS handle the actual HTTP response
					return {
						statusCode: data.statusCode,
						error: data.errorMessage,
					};
				} else if (data instanceof SuccessResponse) {
					// Return the formatted success response object
					// Let NestJS handle the actual HTTP response
					return {
						statusCode: data.statusCode,
						message: data.message,
						data: data.data,
					};
				} else {
					// For other response types, pass through without modification
					return data;
				}
			}),
			catchError((err) => {
				// Re-throw the error to let NestJS exception filters handle it
				throw err;
			})
		);
	}
}
