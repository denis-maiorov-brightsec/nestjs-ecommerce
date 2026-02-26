import {
  BadRequestException,
  INestApplication,
  ValidationError,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

type ValidationDetails = Array<{ field: string; constraints: string[] }>;

export function setupApp(app: INestApplication): void {
  app.enableVersioning({
    type: VersioningType.URI,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors: ValidationError[]) => {
        const details = extractValidationDetails(errors);
        return new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details,
        });
      },
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter());
}

function extractValidationDetails(
  errors: ValidationError[],
  parentPath = '',
): ValidationDetails {
  return errors.flatMap((error) => {
    const fieldPath = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;
    const constraints = error.constraints
      ? Object.values(error.constraints)
      : [];
    const currentError =
      constraints.length > 0 ? [{ field: fieldPath, constraints }] : [];
    const childErrors = error.children
      ? extractValidationDetails(error.children, fieldPath)
      : [];

    return [...currentError, ...childErrors];
  });
}
