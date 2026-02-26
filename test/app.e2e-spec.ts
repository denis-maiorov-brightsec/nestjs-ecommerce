import { Test, TestingModule } from '@nestjs/testing';
import {
  Body,
  Controller,
  Get,
  INestApplication,
  Post,
  Version,
} from '@nestjs/common';
import { Module } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { IsNotEmpty, IsString } from 'class-validator';
import { AppController } from './../src/app.controller';
import { AppService } from './../src/app.service';
import { setupApp } from './../src/setup-app';

class CreateValidationDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}

@Controller('test')
class TestErrorController {
  @Version('1')
  @Post('validation')
  create(@Body() body: CreateValidationDto) {
    return body;
  }

  @Version('1')
  @Get('internal-error')
  getInternalError() {
    throw new Error('Unexpected failure');
  }
}

interface ErrorResponseBody {
  timestamp: string;
  path: string;
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; constraints: string[] }>;
  };
}

@Module({
  controllers: [AppController, TestErrorController],
  providers: [AppService],
})
class TestAppModule {}

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestAppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupApp(app);
    await app.init();
  });

  it('/v1/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/v1/health')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Deprecation', 'true')
      .expect('Sunset', 'Wed, 31 Dec 2026 23:59:59 GMT')
      .expect({
        message:
          'This unversioned endpoint is deprecated. Please migrate to /v1/health.',
      });
  });

  it('returns validation envelope for invalid payloads', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/test/validation')
      .send({})
      .expect(400);
    const body = response.body as ErrorResponseBody;

    expect(body).toMatchObject({
      path: '/v1/test/validation',
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
      },
    });
    expect(body.timestamp).toBeDefined();
    expect(body.error.details).toEqual([
      {
        field: 'name',
        constraints: ['name should not be empty', 'name must be a string'],
      },
    ]);
  });

  it('returns not found envelope for unknown routes', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/unknown-route')
      .expect(404);
    const body = response.body as ErrorResponseBody;

    expect(body).toMatchObject({
      path: '/v1/unknown-route',
      error: {
        code: 'NOT_FOUND',
        message: 'Cannot GET /v1/unknown-route',
      },
    });
    expect(body.timestamp).toBeDefined();
  });

  it('returns sanitized 500 envelope for runtime errors', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/test/internal-error')
      .expect(500);
    const body = response.body as ErrorResponseBody;

    expect(body).toMatchObject({
      path: '/v1/test/internal-error',
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
    expect(body.timestamp).toBeDefined();
    expect(body.error.details).toBeUndefined();
  });
});
