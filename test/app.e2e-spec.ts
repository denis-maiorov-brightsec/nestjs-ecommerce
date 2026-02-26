import { Test, TestingModule } from '@nestjs/testing';
import {
  Body,
  Controller,
  Get,
  INestApplication,
  Module,
  Post,
  Version,
} from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { IsNotEmpty, IsString } from 'class-validator';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';
import { createDataSourceOptions } from './../src/database/typeorm.config';
import { setupApp } from './../src/setup-app';

const TEST_DB_NAME = 'nestjs_ecommerce_e2e';

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

interface ProductResponseBody {
  id: string;
  name: string;
  sku: string;
  price: number;
  status: string;
  categoryId?: string;
  createdAt: string;
  updatedAt: string;
}

function applyTestDatabaseEnv(): void {
  process.env.NODE_ENV = 'production';
  process.env.DB_SYNCHRONIZE = 'false';
  process.env.DB_LOGGING = 'false';
  process.env.DB_HOST = process.env.DB_HOST ?? 'localhost';
  process.env.DB_PORT = process.env.DB_PORT ?? '5432';
  process.env.DB_USERNAME = process.env.DB_USERNAME ?? 'postgres';
  process.env.DB_PASSWORD = process.env.DB_PASSWORD ?? 'postgres';
  process.env.DB_NAME = TEST_DB_NAME;
}

function quoteIdentifier(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

async function ensureTestDatabase(): Promise<void> {
  const adminDataSource = new DataSource({
    ...createDataSourceOptions(),
    database: 'postgres',
    entities: [],
    migrations: [],
  });

  await adminDataSource.initialize();

  try {
    const existingDatabases: unknown = await adminDataSource.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [TEST_DB_NAME],
    );

    if (Array.isArray(existingDatabases) && existingDatabases.length === 0) {
      await adminDataSource.query(
        `CREATE DATABASE ${quoteIdentifier(TEST_DB_NAME)}`,
      );
    }
  } finally {
    await adminDataSource.destroy();
  }
}

function createTestAppModule(appModule: typeof AppModule) {
  @Module({
    imports: [appModule],
    controllers: [TestErrorController],
  })
  class TestAppModule {}

  return TestAppModule;
}

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let migrationDataSource: DataSource;

  const createProduct = async (
    payload?: Partial<ProductResponseBody>,
  ): Promise<ProductResponseBody> => {
    const response = await request(app.getHttpServer())
      .post('/v1/products')
      .send({
        name: 'Keyboard',
        sku: 'KB-001',
        price: 99.99,
        status: 'active',
        ...(payload ?? {}),
      })
      .expect(201);

    return response.body as ProductResponseBody;
  };

  beforeAll(async () => {
    applyTestDatabaseEnv();
    await ensureTestDatabase();

    migrationDataSource = new DataSource(createDataSourceOptions());
    await migrationDataSource.initialize();
    await migrationDataSource.runMigrations();

    const testAppModule = createTestAppModule(AppModule);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [testAppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupApp(app);
    await app.init();
  });

  beforeEach(async () => {
    if (!migrationDataSource?.isInitialized) {
      return;
    }

    await migrationDataSource.query(
      'TRUNCATE TABLE "products" RESTART IDENTITY CASCADE',
    );
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }

    if (migrationDataSource?.isInitialized) {
      await migrationDataSource.destroy();
    }
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

  it('/v1/products (POST) creates a product', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/products')
      .send({
        name: 'Laptop',
        sku: 'LP-001',
        price: 1299.99,
        status: 'active',
        categoryId: 'c-electronics',
      })
      .expect(201);

    const body = response.body as ProductResponseBody;
    expect(body.name).toBe('Laptop');
    expect(body.sku).toBe('LP-001');
    expect(body.price).toBe(1299.99);
    expect(body.status).toBe('active');
    expect(body.categoryId).toBe('c-electronics');
    expect(typeof body.id).toBe('string');
    expect(typeof body.createdAt).toBe('string');
    expect(typeof body.updatedAt).toBe('string');
  });

  it('/v1/products (POST) returns validation envelope for invalid payload', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/products')
      .send({
        name: '',
        sku: 'LP-001',
        price: -10,
        status: 'active',
      })
      .expect(400);
    const body = response.body as ErrorResponseBody;

    expect(body).toMatchObject({
      path: '/v1/products',
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
      },
    });
    expect(body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'name' }),
        expect.objectContaining({ field: 'price' }),
      ]),
    );
  });

  it('/v1/products (GET) lists all created products', async () => {
    await createProduct({ name: 'Mouse', sku: 'MS-001' });
    await createProduct({ name: 'Monitor', sku: 'MN-001' });

    const response = await request(app.getHttpServer())
      .get('/v1/products')
      .expect(200);

    expect(response.body).toHaveLength(2);
    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Mouse', sku: 'MS-001' }),
        expect.objectContaining({ name: 'Monitor', sku: 'MN-001' }),
      ]),
    );
  });

  it('/v1/products/:id (GET) returns one product', async () => {
    const createdProduct = await createProduct({ name: 'Desk', sku: 'DK-001' });

    const response = await request(app.getHttpServer())
      .get(`/v1/products/${createdProduct.id}`)
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: createdProduct.id,
        name: 'Desk',
        sku: 'DK-001',
      }),
    );
  });

  it('/v1/products/:id (GET) returns 404 for missing product', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/products/00000000-0000-0000-0000-000000000000')
      .expect(404);
    const body = response.body as ErrorResponseBody;

    expect(body).toMatchObject({
      path: '/v1/products/00000000-0000-0000-0000-000000000000',
      error: {
        code: 'NOT_FOUND',
        message:
          'Product with id "00000000-0000-0000-0000-000000000000" not found',
      },
    });
  });

  it('/v1/products/:id (PATCH) updates a product', async () => {
    const createdProduct = await createProduct({
      name: 'Chair',
      sku: 'CH-001',
    });

    const response = await request(app.getHttpServer())
      .patch(`/v1/products/${createdProduct.id}`)
      .send({
        price: 149.99,
        status: 'inactive',
      })
      .expect(200);

    const body = response.body as ProductResponseBody;
    expect(body.id).toBe(createdProduct.id);
    expect(body.name).toBe('Chair');
    expect(body.sku).toBe('CH-001');
    expect(body.price).toBe(149.99);
    expect(body.status).toBe('inactive');
    expect(typeof body.createdAt).toBe('string');
    expect(typeof body.updatedAt).toBe('string');
  });

  it('/v1/products/:id (PATCH) validates partial updates', async () => {
    const createdProduct = await createProduct();

    const response = await request(app.getHttpServer())
      .patch(`/v1/products/${createdProduct.id}`)
      .send({
        price: -1,
      })
      .expect(400);
    const body = response.body as ErrorResponseBody;

    expect(body).toMatchObject({
      path: `/v1/products/${createdProduct.id}`,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
      },
    });
    expect(body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'price',
        }),
      ]),
    );
  });

  it('/v1/products/:id (PATCH) returns 404 for missing product', async () => {
    const response = await request(app.getHttpServer())
      .patch('/v1/products/00000000-0000-0000-0000-000000000000')
      .send({
        status: 'inactive',
      })
      .expect(404);
    const body = response.body as ErrorResponseBody;

    expect(body).toMatchObject({
      path: '/v1/products/00000000-0000-0000-0000-000000000000',
      error: {
        code: 'NOT_FOUND',
        message:
          'Product with id "00000000-0000-0000-0000-000000000000" not found',
      },
    });
  });

  it('/v1/products/:id (DELETE) returns 204 and removes product', async () => {
    const createdProduct = await createProduct();

    await request(app.getHttpServer())
      .delete(`/v1/products/${createdProduct.id}`)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/v1/products/${createdProduct.id}`)
      .expect(404);
  });

  it('/v1/products/:id (DELETE) returns 404 for missing product', async () => {
    const response = await request(app.getHttpServer())
      .delete('/v1/products/00000000-0000-0000-0000-000000000000')
      .expect(404);
    const body = response.body as ErrorResponseBody;

    expect(body).toMatchObject({
      path: '/v1/products/00000000-0000-0000-0000-000000000000',
      error: {
        code: 'NOT_FOUND',
        message:
          'Product with id "00000000-0000-0000-0000-000000000000" not found',
      },
    });
  });
});
