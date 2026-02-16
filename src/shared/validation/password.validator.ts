import { registerDecorator, ValidationOptions } from 'class-validator';

/**
 * Password policy — single source of truth.
 *
 * Rules:
 *  - Length: between 8 and 128 characters (max protects against bcrypt DoS)
 *  - At least 1 lowercase letter (a-z)
 *  - At least 1 uppercase letter (A-Z)
 *  - At least 1 digit (0-9)
 *  - At least 1 special character among: @ $ ! % * ? &
 *  - Only the characters listed above are allowed (no spaces, accents, #, -, _, etc.)
 *
 * Used by:
 *  - DTOs: RegisterDto, CreateUserDto, ResetPasswordDto  (via @IsStrongPassword decorator)
 *  - Domain: HashedPassword.fromPlainPassword()           (via imported constants)
 */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/;
export const PASSWORD_RULES_MESSAGE =
  'Le mot de passe doit contenir entre 8 et 128 caractères, avec 1 majuscule, 1 minuscule, 1 chiffre, 1 caractère spécial (@$!%*?&)';

/**
 * class-validator decorator that enforces the password policy above.
 *
 * @example
 *   @IsString()
 *   @IsStrongPassword()
 *   password!: string;
 */
export function IsStrongPassword(validationOptions?: ValidationOptions): PropertyDecorator {
  return function (object: object, propertyName: string | symbol) {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName: propertyName as string,
      options: { message: PASSWORD_RULES_MESSAGE, ...validationOptions },
      validator: {
        validate(value: unknown): boolean {
          if (typeof value !== 'string') return false;
          if (value.length < PASSWORD_MIN_LENGTH) return false;
          if (value.length > PASSWORD_MAX_LENGTH) return false;
          return PASSWORD_REGEX.test(value);
        },
      },
    });
  };
}
