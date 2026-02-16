import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { DomainExceptionFilter } from '@shared/filters/domain-exception.filter';
import { EmailAlreadyExistsException } from '@modules/user/core/application/exceptions/email-already-exists.exception';
import { UserNotFoundException } from '@modules/user/core/application/exceptions/user-not-found.exception';
import { InvalidCredentialsException } from '@modules/auth/core/application/exceptions/invalid-credentials.exception';
import { InvalidRefreshTokenException } from '@modules/auth/core/application/exceptions/invalid-refresh-token.exception';

describe('DomainExceptionFilter', () => {
  let filter: DomainExceptionFilter;
  let mockResponse: any;
  let mockArgumentsHost: ArgumentsHost;

  beforeEach(() => {
    filter = new DomainExceptionFilter();

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    const mockHttpArgumentsHost = {
      getResponse: jest.fn().mockReturnValue(mockResponse),
      getRequest: jest.fn(),
    };

    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue(mockHttpArgumentsHost),
      getArgByIndex: jest.fn(),
      getArgs: jest.fn(),
      getType: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
    };
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  describe('HttpException handling', () => {
    it('should pass through HttpException with status and response', () => {
      // Arrange
      const httpException = new HttpException('Bad Request', HttpStatus.BAD_REQUEST);

      // Act
      filter.catch(httpException, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith('Bad Request');
    });

    it('should handle HttpException with custom response object', () => {
      // Arrange
      const customResponse = {
        statusCode: HttpStatus.BAD_REQUEST,
        message: ['field1 error', 'field2 error'],
        error: 'Bad Request',
      };
      const httpException = new HttpException(customResponse, HttpStatus.BAD_REQUEST);

      // Act
      filter.catch(httpException, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(customResponse);
    });
  });

  describe('Domain exception handling', () => {
    it('should handle EmailAlreadyExistsException with 409 status', () => {
      // Arrange
      const exception = new EmailAlreadyExistsException('test@example.com');

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.CONFLICT,
        message: "Un compte existe déjà avec l'email: test@example.com",
        timestamp: expect.any(String),
      });
    });

    it('should handle UserNotFoundException with 404 status', () => {
      // Arrange
      const exception = new UserNotFoundException('user-123');

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Utilisateur non trouvé: user-123',
        timestamp: expect.any(String),
      });
    });

    it('should handle InvalidCredentialsException with 401 status', () => {
      // Arrange
      const exception = new InvalidCredentialsException();

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.UNAUTHORIZED,
        message: 'Email ou mot de passe incorrect',
        timestamp: expect.any(String),
      });
    });

    it('should handle InvalidRefreshTokenException with 401 status', () => {
      // Arrange
      const exception = new InvalidRefreshTokenException();

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.UNAUTHORIZED,
        message: 'Refresh token invalide ou expiré',
        timestamp: expect.any(String),
      });
    });
  });

  describe('Unknown exception handling', () => {
    it('should handle unknown errors with 500 status', () => {
      // Arrange
      const exception = new Error('Unknown error');

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Une erreur interne est survenue',
        timestamp: expect.any(String),
      });
    });

    it('should log unknown errors', () => {
      // Arrange
      const exception = new Error('Test error');
      const loggerSpy = jest.spyOn(filter['logger'], 'error');

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith('Unhandled exception: Test error', exception.stack);
    });
  });

  describe('Response format', () => {
    it('should include timestamp in ISO format', () => {
      // Arrange
      const exception = new EmailAlreadyExistsException('test@example.com');
      const beforeTime = new Date().toISOString();

      // Act
      filter.catch(exception, mockArgumentsHost);

      // Assert
      const callArgs = mockResponse.json.mock.calls[0][0];
      expect(callArgs.timestamp).toBeDefined();
      expect(new Date(callArgs.timestamp).toISOString()).toBe(callArgs.timestamp);
      expect(callArgs.timestamp >= beforeTime).toBeTruthy();
    });
  });
});
