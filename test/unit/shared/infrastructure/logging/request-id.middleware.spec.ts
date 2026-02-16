import { RequestIdMiddleware } from '@shared/infrastructure/logging/request-id.middleware';
import { Request, Response, NextFunction } from 'express';

describe('RequestIdMiddleware', () => {
  let middleware: RequestIdMiddleware;
  let mockRequest: Partial<Request> & { id?: string };
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    middleware = new RequestIdMiddleware();

    mockRequest = {
      headers: {},
    };

    mockResponse = {
      setHeader: jest.fn(),
    };

    nextFunction = jest.fn();
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  describe('use', () => {
    it('should generate a new request ID if not provided', () => {
      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(mockRequest.id).toBeDefined();
      expect(typeof mockRequest.id).toBe('string');
      expect(mockRequest.id!.length).toBeGreaterThan(0);
      expect(mockRequest.headers!['x-request-id']).toBe(mockRequest.id);
    });

    it('should use existing request ID from headers', () => {
      // Arrange
      const existingId = 'existing-request-id-123';
      mockRequest.headers = {
        'x-request-id': existingId,
      };

      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(mockRequest.id).toBe(existingId);
      expect(mockRequest.headers['x-request-id']).toBe(existingId);
    });

    it('should set request ID in response headers', () => {
      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Request-ID', mockRequest.id);
    });

    it('should call next function', () => {
      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should generate UUID v4 format', () => {
      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(mockRequest.id).toMatch(uuidRegex);
    });

    it('should generate different IDs for different requests', () => {
      // Arrange
      const request1: Partial<Request> = { headers: {} };
      const request2: Partial<Request> = { headers: {} };

      // Act
      middleware.use(request1 as Request, mockResponse as Response, nextFunction);
      middleware.use(request2 as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(request1.id).not.toBe(request2.id);
    });

    it('should handle lowercase header name', () => {
      // Arrange
      const existingId = 'test-id-456';
      mockRequest.headers = {
        'x-request-id': existingId,
      };

      // Act
      middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(mockRequest.id).toBe(existingId);
    });
  });
});
