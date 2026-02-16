import { Test, TestingModule } from '@nestjs/testing';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AuthHttpController } from '@modules/auth/interface/http-controller/auth.http-controller';
import { RegisterDto } from '@modules/auth/core/application/dtos/register.dto';
import { LoginDto } from '@modules/auth/core/application/dtos/login.dto';
import { RegisterCommand } from '@modules/auth/core/application/commands/register/register.command';
import { RefreshTokenCommand } from '@modules/auth/core/application/commands/refresh-token/refresh-token.command';
import { LoginQuery } from '@modules/auth/core/application/queries/login/login.query';
import { LoginResponseDto } from '@modules/auth/core/application/dtos/login-response.dto';
import { RefreshTokenDto } from '@modules/auth/core/application/dtos/refresh-token.dto';

describe('AuthHttpController', () => {
  let controller: AuthHttpController;
  let commandBus: jest.Mocked<CommandBus>;
  let queryBus: jest.Mocked<QueryBus>;

  const mockLoginResponse: LoginResponseDto = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    expiresIn: '15m',
  };

  beforeEach(async () => {
    const mockCommandBus: Partial<CommandBus> = {
      execute: jest.fn(),
    };

    const mockQueryBus: Partial<QueryBus> = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthHttpController],
      providers: [
        {
          provide: CommandBus,
          useValue: mockCommandBus,
        },
        {
          provide: QueryBus,
          useValue: mockQueryBus,
        },
      ],
    }).compile();

    controller = module.get<AuthHttpController>(AuthHttpController);
    commandBus = module.get(CommandBus);
    queryBus = module.get(QueryBus);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user and return tokens', async () => {
      // Arrange
      const dto: RegisterDto = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
      };
      commandBus.execute.mockResolvedValue(mockLoginResponse);

      // Act
      const result = await controller.register(dto);

      // Assert
      expect(commandBus.execute).toHaveBeenCalledWith(expect.any(RegisterCommand));
      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          password: 'Password123!',
          firstName: 'John',
          lastName: 'Doe',
        }),
      );
      expect(result).toEqual(mockLoginResponse);
    });

    it('should pass all fields from DTO to command', async () => {
      // Arrange
      const dto: RegisterDto = {
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        firstName: 'Jane',
        lastName: 'Smith',
      };
      commandBus.execute.mockResolvedValue(mockLoginResponse);

      // Act
      await controller.register(dto);

      // Assert
      const executedCommand = commandBus.execute.mock.calls[0][0] as RegisterCommand;
      expect(executedCommand.email).toBe('newuser@example.com');
      expect(executedCommand.password).toBe('SecurePass123!');
      expect(executedCommand.firstName).toBe('Jane');
      expect(executedCommand.lastName).toBe('Smith');
    });

    it('should return LoginResponseDto with tokens', async () => {
      // Arrange
      const dto: RegisterDto = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Doe',
      };
      const customResponse: LoginResponseDto = {
        accessToken: 'custom-access-token',
        refreshToken: 'custom-refresh-token',
        expiresIn: '30m',
      };
      commandBus.execute.mockResolvedValue(customResponse);

      // Act
      const result = await controller.register(dto);

      // Assert
      expect(result.accessToken).toBe('custom-access-token');
      expect(result.refreshToken).toBe('custom-refresh-token');
      expect(result.expiresIn).toBe('30m');
    });
  });

  describe('login', () => {
    it('should login with valid credentials and return tokens', async () => {
      // Arrange
      const dto: LoginDto = {
        email: 'test@example.com',
        password: 'Password123!',
      };
      queryBus.execute.mockResolvedValue(mockLoginResponse);

      // Act
      const result = await controller.login(dto);

      // Assert
      expect(queryBus.execute).toHaveBeenCalledWith(expect.any(LoginQuery));
      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          password: 'Password123!',
        }),
      );
      expect(result).toEqual(mockLoginResponse);
    });

    it('should pass credentials from DTO to query', async () => {
      // Arrange
      const dto: LoginDto = {
        email: 'user@example.com',
        password: 'MyPassword123!',
      };
      queryBus.execute.mockResolvedValue(mockLoginResponse);

      // Act
      await controller.login(dto);

      // Assert
      const executedQuery = queryBus.execute.mock.calls[0][0] as LoginQuery;
      expect(executedQuery.email).toBe('user@example.com');
      expect(executedQuery.password).toBe('MyPassword123!');
    });

    it('should return LoginResponseDto with tokens', async () => {
      // Arrange
      const dto: LoginDto = {
        email: 'test@example.com',
        password: 'Password123!',
      };
      const customResponse: LoginResponseDto = {
        accessToken: 'login-access-token',
        refreshToken: 'login-refresh-token',
        expiresIn: '20m',
      };
      queryBus.execute.mockResolvedValue(customResponse);

      // Act
      const result = await controller.login(dto);

      // Assert
      expect(result.accessToken).toBe('login-access-token');
      expect(result.refreshToken).toBe('login-refresh-token');
      expect(result.expiresIn).toBe('20m');
    });
  });

  describe('refresh', () => {
    it('should refresh tokens and return new pair', async () => {
      // Arrange
      const dto: RefreshTokenDto = {
        refreshToken: 'old-refresh-token',
      };
      const refreshedResponse: LoginResponseDto = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: '15m',
      };
      commandBus.execute.mockResolvedValue(refreshedResponse);

      // Act
      const result = await controller.refresh(dto);

      // Assert
      expect(commandBus.execute).toHaveBeenCalledWith(expect.any(RefreshTokenCommand));
      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({ refreshToken: 'old-refresh-token' }),
      );
      expect(result).toEqual(refreshedResponse);
    });
  });
});
