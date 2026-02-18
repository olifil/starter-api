import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Logger,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';
import { EmailAlreadyExistsException } from '@modules/user/core/application/exceptions/email-already-exists.exception';
import { UserNotFoundException } from '@modules/user/core/application/exceptions/user-not-found.exception';
import { InvalidCredentialsException } from '@modules/auth/core/application/exceptions/invalid-credentials.exception';
import { InvalidResetTokenException } from '@modules/auth/core/application/exceptions/invalid-reset-token.exception';
import { InvalidVerificationTokenException } from '@modules/auth/core/application/exceptions/invalid-verification-token.exception';
import { InvalidRefreshTokenException } from '@modules/auth/core/application/exceptions/invalid-refresh-token.exception';
import { EmailNotVerifiedException } from '@modules/auth/core/application/exceptions/email-not-verified.exception';
import { NotificationNotFoundException } from '@modules/notification/core/application/exceptions/notification-not-found.exception';
import { ChannelDisabledException } from '@modules/notification/core/application/exceptions/channel-disabled.exception';

@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: Error | HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // If it's already an HTTP exception, let it pass through
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      response.status(status).json(exceptionResponse);
      return;
    }

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Une erreur interne est survenue';

    // Map domain exceptions to HTTP status codes
    if (exception instanceof EmailAlreadyExistsException) {
      status = HttpStatus.CONFLICT;
      message = exception.message;
    } else if (exception instanceof UserNotFoundException) {
      status = HttpStatus.NOT_FOUND;
      message = exception.message;
    } else if (exception instanceof InvalidCredentialsException) {
      status = HttpStatus.UNAUTHORIZED;
      message = exception.message;
    } else if (exception instanceof NotificationNotFoundException) {
      status = HttpStatus.NOT_FOUND;
      message = exception.message;
    } else if (exception instanceof ChannelDisabledException) {
      status = HttpStatus.UNPROCESSABLE_ENTITY;
      message = exception.message;
    } else if (exception instanceof InvalidResetTokenException) {
      status = HttpStatus.BAD_REQUEST;
      message = exception.message;
    } else if (exception instanceof InvalidVerificationTokenException) {
      status = HttpStatus.BAD_REQUEST;
      message = exception.message;
    } else if (exception instanceof InvalidRefreshTokenException) {
      status = HttpStatus.UNAUTHORIZED;
      message = exception.message;
    } else if (exception instanceof EmailNotVerifiedException) {
      status = HttpStatus.FORBIDDEN;
      message = exception.message;
    } else {
      // Log unexpected errors
      this.logger.error(`Unhandled exception: ${exception.message}`, exception.stack);
    }

    response.status(status).json({
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
