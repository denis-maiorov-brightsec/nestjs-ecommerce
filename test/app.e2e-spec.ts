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
import request, { Response } from 'supertest';
import { App } from 'supertest/types';
import { IsNotEmpty, IsString } from 'class-validator';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module';
import { DEFAULT_WRITE_RATE_LIMIT } from './../src/common/rate-limit/write-rate-limit.defaults';
import { WriteRateLimitStore } from './../src/common/rate-limit/write-rate-limit.store';
import { createDataSourceOptions } from './../src/database/typeorm.config';
import { setupApp } from './../src/setup-app';

const TEST_DB_NAME = 'nestjs_ecommerce_e2e';
const TEST_ADMIN_TOKEN = 'test-admin-token';
const TEST_RATE_LIMIT_MAX_REQUESTS = DEFAULT_WRITE_RATE_LIMIT.limit;
const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  requestId: string;
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

interface PaginatedResponseBody<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
  };
}

interface CategoryResponseBody {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

type PromotionType = 'percentage' | 'fixed';

interface PromotionResponseBody {
  id: string;
  name: string;
  type: PromotionType;
  value: number;
  isActive: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CreatePromotionPayload {
  name?: string;
  type?: PromotionType;
  value?: number;
  isActive?: boolean;
  startsAt?: string;
  endsAt?: string;
}

type OrderStatus = 'pending' | 'paid' | 'shipped' | 'cancelled';

interface OrderResponseBody {
  id: string;
  status: OrderStatus;
  customerId: string;
  items: Array<Record<string, unknown>>;
  currency: string;
  totalAmount: number;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CreateOrderPayload {
  status?: OrderStatus;
  customerId?: string;
  items?: Array<Record<string, unknown>>;
  currency?: string;
  totalAmount?: number;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

interface RawOrderRow extends Omit<
  OrderResponseBody,
  'createdAt' | 'updatedAt' | 'totalAmount'
> {
  cancelledAt: string | Date | null;
  cancellationReason: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  totalAmount: number | string;
}

function applyTestDatabaseEnv(): void {
  process.env.NODE_ENV = 'production';
  process.env.ADMIN_TOKEN = TEST_ADMIN_TOKEN;
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

function toIsoTimestamp(value: string | Date): string {
  return new Date(value).toISOString();
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

  const createCategory = async (
    payload?: Partial<CategoryResponseBody>,
  ): Promise<CategoryResponseBody> => {
    const response = await request(app.getHttpServer())
      .post('/v1/categories')
      .send({
        name: 'Electronics',
        description: 'All electronic products',
        isActive: true,
        ...(payload ?? {}),
      })
      .expect(201);

    return response.body as CategoryResponseBody;
  };

  const createPromotion = async (
    payload?: CreatePromotionPayload,
  ): Promise<PromotionResponseBody> => {
    const response = await request(app.getHttpServer())
      .post('/v1/promotions')
      .set('x-admin-token', TEST_ADMIN_TOKEN)
      .send({
        name: 'Spring Sale',
        type: 'percentage',
        value: 15,
        isActive: true,
        ...(payload ?? {}),
      })
      .expect(201);

    return response.body as PromotionResponseBody;
  };

  const createOrder = async (
    payload?: CreateOrderPayload,
  ): Promise<OrderResponseBody> => {
    const createdAt = payload?.createdAt ?? '2025-01-01T00:00:00.000Z';
    const updatedAt = payload?.updatedAt ?? createdAt;
    const rows: RawOrderRow[] = await migrationDataSource.query(
      `
        INSERT INTO "orders" (
          "status",
          "customerId",
          "items",
          "currency",
          "totalAmount",
          "cancelledAt",
          "cancellationReason",
          "createdAt",
          "updatedAt"
        )
        VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7, $8, $9)
        RETURNING
          "id",
          "status",
          "customerId",
          "items",
          "currency",
          "totalAmount",
          "cancelledAt",
          "cancellationReason",
          "createdAt",
          "updatedAt"
      `,
      [
        payload?.status ?? 'pending',
        payload?.customerId ?? 'customer-001',
        JSON.stringify(
          payload?.items ?? [
            {
              productId: 'product-001',
              quantity: 1,
              unitPrice: 49.99,
            },
          ],
        ),
        payload?.currency ?? 'USD',
        payload?.totalAmount ?? 49.99,
        payload?.cancelledAt ?? null,
        payload?.cancellationReason ?? null,
        createdAt,
        updatedAt,
      ],
    );

    const createdOrder = rows[0];
    return {
      ...createdOrder,
      totalAmount: Number(createdOrder.totalAmount),
      cancelledAt: createdOrder.cancelledAt
        ? toIsoTimestamp(createdOrder.cancelledAt)
        : null,
      createdAt: toIsoTimestamp(createdOrder.createdAt),
      updatedAt: toIsoTimestamp(createdOrder.updatedAt),
    };
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

    app.get(WriteRateLimitStore).reset();

    await migrationDataSource.query(
      'TRUNCATE TABLE "products", "categories", "orders", "promotions" RESTART IDENTITY CASCADE',
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

  it('adds x-request-id header when request id is not provided', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/health')
      .expect(200);

    const requestIdHeader = response.header['x-request-id'];
    expect(typeof requestIdHeader).toBe('string');
    expect(requestIdHeader).toMatch(UUID_V4_REGEX);
  });

  it('propagates incoming x-request-id to response header', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/health')
      .set('x-request-id', 'req-from-client-123')
      .expect(200);

    expect(response.header['x-request-id']).toBe('req-from-client-123');
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

  it('returns requestId in error envelope matching x-request-id response header', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/test/validation')
      .set('x-request-id', 'req-error-001')
      .send({})
      .expect(400);
    const body = response.body as ErrorResponseBody;

    expect(response.header['x-request-id']).toBe('req-error-001');
    expect(body.requestId).toBe('req-error-001');
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
    const body = response.body as PaginatedResponseBody<ProductResponseBody>;

    expect(body.meta).toEqual({
      page: 1,
      limit: 20,
      total: 2,
      hasNext: false,
    });
    expect(body.data).toHaveLength(2);
    expect(body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Mouse', sku: 'MS-001' }),
        expect.objectContaining({ name: 'Monitor', sku: 'MN-001' }),
      ]),
    );
  });

  it('/v1/products (GET) supports pagination query params', async () => {
    await createProduct({ name: 'Mouse', sku: 'MS-001' });
    await createProduct({ name: 'Monitor', sku: 'MN-001' });
    await createProduct({ name: 'Keyboard', sku: 'KB-002' });

    const response = await request(app.getHttpServer())
      .get('/v1/products?page=2&limit=2')
      .expect(200);
    const body = response.body as PaginatedResponseBody<ProductResponseBody>;

    expect(body.meta).toEqual({
      page: 2,
      limit: 2,
      total: 3,
      hasNext: false,
    });
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toEqual(
      expect.objectContaining({ name: 'Keyboard', sku: 'KB-002' }),
    );
  });

  it('/v1/products (GET) returns 400 for invalid pagination params', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/products?page=0')
      .expect(400);
    const body = response.body as ErrorResponseBody;

    expect(body.error).toEqual({
      code: 'BAD_REQUEST',
      message: '"page" must be a positive integer',
    });
  });

  it('/v1/search/products (GET) returns 400 when q is missing', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/search/products')
      .expect(400);
    const body = response.body as ErrorResponseBody;

    expect(body).toMatchObject({
      path: '/v1/search/products',
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
      },
    });
    expect(body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'q' })]),
    );
  });

  it('/v1/search/products (GET) returns 400 when q is shorter than 2 chars', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/search/products?q=a')
      .expect(400);
    const body = response.body as ErrorResponseBody;

    expect(body).toMatchObject({
      path: '/v1/search/products?q=a',
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
      },
    });
    expect(body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'q' })]),
    );
  });

  it('/v1/search/products (GET) supports partial, case-insensitive matches by name and sku', async () => {
    await createProduct({ name: 'Gaming Mouse', sku: 'GM-100' });
    await createProduct({ name: 'Desk Lamp', sku: 'LP-200' });
    await createProduct({ name: 'Notebook', sku: 'NB-300' });

    const byNameResponse = await request(app.getHttpServer())
      .get('/v1/search/products?q=MOU')
      .expect(200);
    const byNameBody =
      byNameResponse.body as PaginatedResponseBody<ProductResponseBody>;

    expect(byNameBody.data).toHaveLength(1);
    expect(byNameBody.data[0]).toEqual(
      expect.objectContaining({
        name: 'Gaming Mouse',
        sku: 'GM-100',
      }),
    );

    const bySkuResponse = await request(app.getHttpServer())
      .get('/v1/search/products?q=lp')
      .expect(200);
    const bySkuBody =
      bySkuResponse.body as PaginatedResponseBody<ProductResponseBody>;

    expect(bySkuBody.data).toHaveLength(1);
    expect(bySkuBody.data[0]).toEqual(
      expect.objectContaining({
        name: 'Desk Lamp',
        sku: 'LP-200',
      }),
    );
  });

  it('/v1/search/products (GET) returns paginated data with metadata', async () => {
    await createProduct({ name: 'Pro Mouse', sku: 'PRO-001' });
    await createProduct({ name: 'Pro Keyboard', sku: 'PRO-002' });
    await createProduct({ name: 'Pro Display', sku: 'PRO-003' });
    await createProduct({ name: 'Standard Dock', sku: 'STD-001' });

    const response = await request(app.getHttpServer())
      .get('/v1/search/products?q=pro&page=2&limit=2')
      .expect(200);
    const body = response.body as PaginatedResponseBody<ProductResponseBody>;

    expect(body.meta).toEqual({
      page: 2,
      limit: 2,
      total: 3,
      hasNext: false,
    });
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toEqual(
      expect.objectContaining({
        name: 'Pro Display',
        sku: 'PRO-003',
      }),
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

  it('/v1/orders/:id (GET) returns one order with full representation', async () => {
    const createdOrder = await createOrder({
      status: 'paid',
      customerId: 'customer-abc',
      items: [
        {
          productId: 'product-123',
          quantity: 2,
          unitPrice: 30,
        },
      ],
      currency: 'USD',
      totalAmount: 60,
      createdAt: '2025-01-10T10:00:00.000Z',
      updatedAt: '2025-01-10T10:00:00.000Z',
    });

    const response = await request(app.getHttpServer())
      .get(`/v1/orders/${createdOrder.id}`)
      .expect(200);
    const body = response.body as OrderResponseBody;

    expect(body).toEqual(
      expect.objectContaining({
        id: createdOrder.id,
        status: 'paid',
        customerId: 'customer-abc',
        items: [
          {
            productId: 'product-123',
            quantity: 2,
            unitPrice: 30,
          },
        ],
        currency: 'USD',
        totalAmount: 60,
      }),
    );
    expect(typeof body.createdAt).toBe('string');
    expect(typeof body.updatedAt).toBe('string');
  });

  it('/v1/orders/:id (GET) returns 404 for missing order', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/orders/00000000-0000-0000-0000-000000000000')
      .expect(404);
    const body = response.body as ErrorResponseBody;

    expect(body).toMatchObject({
      path: '/v1/orders/00000000-0000-0000-0000-000000000000',
      error: {
        code: 'NOT_FOUND',
        message:
          'Order with id "00000000-0000-0000-0000-000000000000" not found',
      },
    });
  });

  it('/v1/orders/:id/cancel (POST) cancels a pending order and reflects status in detail/list', async () => {
    const createdOrder = await createOrder({
      status: 'pending',
      updatedAt: '2025-01-10T10:00:00.000Z',
    });

    const cancelResponse = await request(app.getHttpServer())
      .post(`/v1/orders/${createdOrder.id}/cancel`)
      .send({
        reason: 'Customer requested cancellation',
      })
      .expect(200);
    const cancelledOrder = cancelResponse.body as OrderResponseBody;

    expect(cancelledOrder).toEqual(
      expect.objectContaining({
        id: createdOrder.id,
        status: 'cancelled',
        cancellationReason: 'Customer requested cancellation',
      }),
    );
    expect(typeof cancelledOrder.cancelledAt).toBe('string');
    expect(new Date(cancelledOrder.updatedAt).getTime()).toBeGreaterThan(
      new Date(createdOrder.updatedAt).getTime(),
    );

    const detailResponse = await request(app.getHttpServer())
      .get(`/v1/orders/${createdOrder.id}`)
      .expect(200);
    expect((detailResponse.body as OrderResponseBody).status).toBe('cancelled');

    const listResponse = await request(app.getHttpServer())
      .get('/v1/orders?status=cancelled')
      .expect(200);
    const listBody =
      listResponse.body as PaginatedResponseBody<OrderResponseBody>;

    expect(listBody.meta.total).toBe(1);
    expect(listBody.data[0].id).toBe(createdOrder.id);
    expect(listBody.data[0].status).toBe('cancelled');
  });

  it('/v1/orders/:id/cancel (POST) returns 409 for shipped orders', async () => {
    const shippedOrder = await createOrder({
      status: 'shipped',
    });

    const response = await request(app.getHttpServer())
      .post(`/v1/orders/${shippedOrder.id}/cancel`)
      .send({
        reason: 'Customer requested cancellation',
      })
      .expect(409);
    const body = response.body as ErrorResponseBody;

    expect(body).toMatchObject({
      path: `/v1/orders/${shippedOrder.id}/cancel`,
      error: {
        code: 'ORDER_STATUS_CONFLICT',
        message: `Order with id "${shippedOrder.id}" cannot be cancelled from status "shipped"`,
      },
    });

    const detailResponse = await request(app.getHttpServer())
      .get(`/v1/orders/${shippedOrder.id}`)
      .expect(200);
    expect((detailResponse.body as OrderResponseBody).status).toBe('shipped');
  });

  it('/v1/orders/:id/cancel (POST) is idempotent for already cancelled orders', async () => {
    const createdOrder = await createOrder({
      status: 'cancelled',
      cancelledAt: '2025-01-11T12:00:00.000Z',
      cancellationReason: 'Initial cancellation',
      updatedAt: '2025-01-11T12:00:00.000Z',
    });

    const response = await request(app.getHttpServer())
      .post(`/v1/orders/${createdOrder.id}/cancel`)
      .send({
        reason: 'New cancellation reason should be ignored',
      })
      .expect(200);
    const body = response.body as OrderResponseBody;

    expect(body).toEqual(
      expect.objectContaining({
        id: createdOrder.id,
        status: 'cancelled',
        cancelledAt: createdOrder.cancelledAt,
        cancellationReason: 'Initial cancellation',
        updatedAt: createdOrder.updatedAt,
      }),
    );
  });

  it('/v1/orders (GET) filters by status', async () => {
    await createOrder({
      status: 'pending',
      createdAt: '2025-01-01T00:00:00.000Z',
    });
    await createOrder({
      status: 'paid',
      createdAt: '2025-01-02T00:00:00.000Z',
    });
    await createOrder({
      status: 'shipped',
      createdAt: '2025-01-03T00:00:00.000Z',
    });

    const response = await request(app.getHttpServer())
      .get('/v1/orders?status=paid')
      .expect(200);
    const body = response.body as PaginatedResponseBody<OrderResponseBody>;

    expect(body.meta).toEqual({
      page: 1,
      limit: 20,
      total: 1,
      hasNext: false,
    });
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toEqual(
      expect.objectContaining({
        status: 'paid',
      }),
    );
  });

  it('/v1/orders (GET) filters by date range', async () => {
    await createOrder({
      status: 'pending',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    });
    const inRangeOrder = await createOrder({
      status: 'paid',
      createdAt: '2025-01-05T12:00:00.000Z',
      updatedAt: '2025-01-05T12:00:00.000Z',
    });
    await createOrder({
      status: 'shipped',
      createdAt: '2025-01-10T00:00:00.000Z',
      updatedAt: '2025-01-10T00:00:00.000Z',
    });

    const response = await request(app.getHttpServer())
      .get(
        '/v1/orders?from=2025-01-02T00:00:00.000Z&to=2025-01-09T23:59:59.000Z',
      )
      .expect(200);
    const body = response.body as PaginatedResponseBody<OrderResponseBody>;

    expect(body.meta).toEqual({
      page: 1,
      limit: 20,
      total: 1,
      hasNext: false,
    });
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe(inRangeOrder.id);
  });

  it('/v1/orders (GET) supports combined filters and pagination metadata', async () => {
    await createOrder({
      status: 'pending',
      customerId: 'customer-01',
      createdAt: '2025-01-01T00:00:00.000Z',
    });
    await createOrder({
      status: 'pending',
      customerId: 'customer-02',
      createdAt: '2025-01-02T00:00:00.000Z',
    });
    const expectedOrder = await createOrder({
      status: 'pending',
      customerId: 'customer-03',
      createdAt: '2025-01-03T00:00:00.000Z',
    });
    await createOrder({
      status: 'paid',
      customerId: 'customer-04',
      createdAt: '2025-01-04T00:00:00.000Z',
    });

    const response = await request(app.getHttpServer())
      .get(
        '/v1/orders?status=pending&from=2025-01-01T00:00:00.000Z&to=2025-01-31T23:59:59.000Z&page=2&limit=2',
      )
      .expect(200);
    const body = response.body as PaginatedResponseBody<OrderResponseBody>;

    expect(body.meta).toEqual({
      page: 2,
      limit: 2,
      total: 3,
      hasNext: false,
    });
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe(expectedOrder.id);
    expect(body.data[0].status).toBe('pending');
  });

  it('/v1/orders (GET) returns 400 for invalid status filter', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/orders?status=draft')
      .expect(400);
    const body = response.body as ErrorResponseBody;

    expect(body.error).toEqual({
      code: 'BAD_REQUEST',
      message: '"status" must be one of: pending, paid, shipped, cancelled',
    });
  });

  it('/v1/orders (GET) returns 400 for invalid date filter', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/orders?from=2025-01-01')
      .expect(400);
    const body = response.body as ErrorResponseBody;

    expect(body.error).toEqual({
      code: 'BAD_REQUEST',
      message: '"from" must be a valid ISO timestamp',
    });
  });

  it('/v1/orders (GET) returns deterministic ordering for identical timestamps', async () => {
    const firstOrder = await createOrder({
      status: 'paid',
      createdAt: '2025-01-05T09:00:00.000Z',
      updatedAt: '2025-01-05T09:00:00.000Z',
    });
    const secondOrder = await createOrder({
      status: 'paid',
      createdAt: '2025-01-05T09:00:00.000Z',
      updatedAt: '2025-01-05T09:00:00.000Z',
    });
    const thirdOrder = await createOrder({
      status: 'paid',
      createdAt: '2025-01-05T09:00:00.000Z',
      updatedAt: '2025-01-05T09:00:00.000Z',
    });

    const response = await request(app.getHttpServer())
      .get('/v1/orders?status=paid')
      .expect(200);
    const body = response.body as PaginatedResponseBody<OrderResponseBody>;

    const actualIds = body.data.map((order) => order.id);
    const expectedIds = [firstOrder.id, secondOrder.id, thirdOrder.id].sort();
    expect(actualIds).toEqual(expectedIds);
  });

  it('/v1/categories (POST) creates a category', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/categories')
      .send({
        name: 'Office',
        description: 'Office supplies',
        isActive: true,
      })
      .expect(201);

    const body = response.body as CategoryResponseBody;
    expect(body.name).toBe('Office');
    expect(body.description).toBe('Office supplies');
    expect(body.isActive).toBe(true);
    expect(typeof body.id).toBe('string');
    expect(typeof body.createdAt).toBe('string');
    expect(typeof body.updatedAt).toBe('string');
  });

  it('/v1/categories (POST) returns validation envelope for invalid payload', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/categories')
      .send({
        name: '',
        isActive: 'true',
      })
      .expect(400);
    const body = response.body as ErrorResponseBody;

    expect(body).toMatchObject({
      path: '/v1/categories',
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
      },
    });
    expect(body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'name' }),
        expect.objectContaining({ field: 'isActive' }),
      ]),
    );
  });

  it('/v1/categories (POST) returns 409 for duplicate category name', async () => {
    await createCategory({ name: 'Accessories' });

    const response = await request(app.getHttpServer())
      .post('/v1/categories')
      .send({
        name: 'Accessories',
        isActive: true,
      })
      .expect(409);
    const body = response.body as ErrorResponseBody;

    expect(body).toMatchObject({
      path: '/v1/categories',
      error: {
        code: 'CONFLICT',
        message: 'Category with name "Accessories" already exists',
      },
    });
  });

  it('/v1/categories (GET) lists all created categories', async () => {
    await createCategory({ name: 'Hardware' });
    await createCategory({ name: 'Software' });

    const response = await request(app.getHttpServer())
      .get('/v1/categories')
      .expect(200);

    expect(response.body).toHaveLength(2);
    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Hardware' }),
        expect.objectContaining({ name: 'Software' }),
      ]),
    );
  });

  it('/v1/categories/:id (GET) returns one category', async () => {
    const createdCategory = await createCategory({ name: 'Furniture' });

    const response = await request(app.getHttpServer())
      .get(`/v1/categories/${createdCategory.id}`)
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: createdCategory.id,
        name: 'Furniture',
      }),
    );
  });

  it('/v1/categories/:id (GET) returns 404 for missing category', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/categories/00000000-0000-0000-0000-000000000000')
      .expect(404);
    const body = response.body as ErrorResponseBody;

    expect(body).toMatchObject({
      path: '/v1/categories/00000000-0000-0000-0000-000000000000',
      error: {
        code: 'NOT_FOUND',
        message:
          'Category with id "00000000-0000-0000-0000-000000000000" not found',
      },
    });
  });

  it('/v1/categories/:id (PATCH) updates a category', async () => {
    const createdCategory = await createCategory({
      name: 'Gaming',
      description: 'Gaming products',
      isActive: true,
    });

    const response = await request(app.getHttpServer())
      .patch(`/v1/categories/${createdCategory.id}`)
      .send({
        description: 'Gaming and accessories',
        isActive: false,
      })
      .expect(200);

    const body = response.body as CategoryResponseBody;
    expect(body.id).toBe(createdCategory.id);
    expect(body.name).toBe('Gaming');
    expect(body.description).toBe('Gaming and accessories');
    expect(body.isActive).toBe(false);
    expect(typeof body.createdAt).toBe('string');
    expect(typeof body.updatedAt).toBe('string');
  });

  it('/v1/categories/:id (PATCH) validates partial updates', async () => {
    const createdCategory = await createCategory();

    const response = await request(app.getHttpServer())
      .patch(`/v1/categories/${createdCategory.id}`)
      .send({
        isActive: 'false',
      })
      .expect(400);
    const body = response.body as ErrorResponseBody;

    expect(body).toMatchObject({
      path: `/v1/categories/${createdCategory.id}`,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
      },
    });
    expect(body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'isActive' })]),
    );
  });

  it('/v1/categories/:id (PATCH) returns 409 for duplicate category name', async () => {
    const baseCategory = await createCategory({ name: 'Audio' });
    const targetCategory = await createCategory({ name: 'Video' });

    const response = await request(app.getHttpServer())
      .patch(`/v1/categories/${targetCategory.id}`)
      .send({
        name: baseCategory.name,
      })
      .expect(409);
    const body = response.body as ErrorResponseBody;

    expect(body).toMatchObject({
      path: `/v1/categories/${targetCategory.id}`,
      error: {
        code: 'CONFLICT',
        message: 'Category with name "Audio" already exists',
      },
    });
  });

  it('/v1/categories/:id (PATCH) returns 404 for missing category', async () => {
    const response = await request(app.getHttpServer())
      .patch('/v1/categories/00000000-0000-0000-0000-000000000000')
      .send({
        isActive: false,
      })
      .expect(404);
    const body = response.body as ErrorResponseBody;

    expect(body).toMatchObject({
      path: '/v1/categories/00000000-0000-0000-0000-000000000000',
      error: {
        code: 'NOT_FOUND',
        message:
          'Category with id "00000000-0000-0000-0000-000000000000" not found',
      },
    });
  });

  it('/v1/categories/:id (DELETE) returns 204 and removes category', async () => {
    const createdCategory = await createCategory();

    await request(app.getHttpServer())
      .delete(`/v1/categories/${createdCategory.id}`)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/v1/categories/${createdCategory.id}`)
      .expect(404);
  });

  it('/v1/categories/:id (DELETE) returns 404 for missing category', async () => {
    const response = await request(app.getHttpServer())
      .delete('/v1/categories/00000000-0000-0000-0000-000000000000')
      .expect(404);
    const body = response.body as ErrorResponseBody;

    expect(body).toMatchObject({
      path: '/v1/categories/00000000-0000-0000-0000-000000000000',
      error: {
        code: 'NOT_FOUND',
        message:
          'Category with id "00000000-0000-0000-0000-000000000000" not found',
      },
    });
  });

  it('/v1/products (GET) remains unprotected without admin token', async () => {
    await createProduct({ name: 'Public Product', sku: 'PUB-001' });

    const response = await request(app.getHttpServer())
      .get('/v1/products')
      .expect(200);
    const body = response.body as PaginatedResponseBody<ProductResponseBody>;

    expect(body.meta.total).toBe(1);
    expect(body.data[0]).toEqual(
      expect.objectContaining({ name: 'Public Product', sku: 'PUB-001' }),
    );
  });

  it('/v1/promotions (GET) returns 401 without x-admin-token', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/promotions')
      .expect(401);
    const body = response.body as ErrorResponseBody;

    expect(body).toMatchObject({
      path: '/v1/promotions',
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or missing admin token',
      },
    });
  });

  it('/v1/promotions (GET) succeeds with valid x-admin-token', async () => {
    await createPromotion({
      name: 'Authorized Promo',
      type: 'fixed',
      value: 30,
    });

    const response = await request(app.getHttpServer())
      .get('/v1/promotions')
      .set('x-admin-token', TEST_ADMIN_TOKEN)
      .expect(200);
    const body = response.body as PromotionResponseBody[];

    expect(body).toHaveLength(1);
    expect(body[0]).toEqual(
      expect.objectContaining({
        name: 'Authorized Promo',
        type: 'fixed',
        value: 30,
      }),
    );
  });

  it('/v1/promotions (POST) creates a percentage promotion', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/promotions')
      .set('x-admin-token', TEST_ADMIN_TOKEN)
      .send({
        name: 'Summer Sale',
        type: 'percentage',
        value: 20,
        isActive: true,
      })
      .expect(201);
    const body = response.body as PromotionResponseBody;

    expect(body).toEqual(
      expect.objectContaining({
        name: 'Summer Sale',
        type: 'percentage',
        value: 20,
        isActive: true,
      }),
    );
    expect(body.startsAt).toBeNull();
    expect(body.endsAt).toBeNull();
    expect(typeof body.id).toBe('string');
    expect(typeof body.createdAt).toBe('string');
    expect(typeof body.updatedAt).toBe('string');
  });

  it('/v1/promotions (POST) creates a fixed promotion with schedule', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/promotions')
      .set('x-admin-token', TEST_ADMIN_TOKEN)
      .send({
        name: 'Holiday Voucher',
        type: 'fixed',
        value: 35,
        isActive: false,
        startsAt: '2025-02-01T00:00:00.000Z',
        endsAt: '2025-02-15T23:59:59.000Z',
      })
      .expect(201);
    const body = response.body as PromotionResponseBody;

    expect(body).toEqual(
      expect.objectContaining({
        name: 'Holiday Voucher',
        type: 'fixed',
        value: 35,
        isActive: false,
        startsAt: '2025-02-01T00:00:00.000Z',
        endsAt: '2025-02-15T23:59:59.000Z',
      }),
    );
  });

  it('/v1/promotions (GET) lists all created promotions', async () => {
    await createPromotion({
      name: 'Promo A',
      type: 'percentage',
      value: 10,
    });
    await createPromotion({
      name: 'Promo B',
      type: 'fixed',
      value: 25,
    });

    const response = await request(app.getHttpServer())
      .get('/v1/promotions')
      .set('x-admin-token', TEST_ADMIN_TOKEN)
      .expect(200);

    expect(response.body).toHaveLength(2);
    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Promo A',
          type: 'percentage',
          value: 10,
        }),
        expect.objectContaining({
          name: 'Promo B',
          type: 'fixed',
          value: 25,
        }),
      ]),
    );
  });

  it('/v1/promotions/:id (GET) returns one promotion', async () => {
    const createdPromotion = await createPromotion({
      name: 'Weekend Sale',
      type: 'percentage',
      value: 12,
    });

    const response = await request(app.getHttpServer())
      .get(`/v1/promotions/${createdPromotion.id}`)
      .set('x-admin-token', TEST_ADMIN_TOKEN)
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: createdPromotion.id,
        name: 'Weekend Sale',
        type: 'percentage',
        value: 12,
      }),
    );
  });

  it('/v1/promotions/:id (PATCH) updates a fixed promotion to percentage', async () => {
    const createdPromotion = await createPromotion({
      type: 'fixed',
      value: 50,
      name: 'Cross Type Promo',
    });

    const response = await request(app.getHttpServer())
      .patch(`/v1/promotions/${createdPromotion.id}`)
      .set('x-admin-token', TEST_ADMIN_TOKEN)
      .send({
        type: 'percentage',
        value: 25,
      })
      .expect(200);
    const body = response.body as PromotionResponseBody;

    expect(body).toEqual(
      expect.objectContaining({
        id: createdPromotion.id,
        name: 'Cross Type Promo',
        type: 'percentage',
        value: 25,
      }),
    );
  });

  it('/v1/promotions/:id (PATCH) updates a percentage promotion to fixed', async () => {
    const createdPromotion = await createPromotion({
      type: 'percentage',
      value: 30,
      name: 'Cross Type Promo 2',
    });

    const response = await request(app.getHttpServer())
      .patch(`/v1/promotions/${createdPromotion.id}`)
      .set('x-admin-token', TEST_ADMIN_TOKEN)
      .send({
        type: 'fixed',
        value: 15,
      })
      .expect(200);
    const body = response.body as PromotionResponseBody;

    expect(body).toEqual(
      expect.objectContaining({
        id: createdPromotion.id,
        name: 'Cross Type Promo 2',
        type: 'fixed',
        value: 15,
      }),
    );
  });

  it('/v1/promotions (POST) returns 400 for invalid percentage value', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/promotions')
      .set('x-admin-token', TEST_ADMIN_TOKEN)
      .send({
        name: 'Invalid Percentage',
        type: 'percentage',
        value: 150,
        isActive: true,
      })
      .expect(400);
    const body = response.body as ErrorResponseBody;

    expect(body).toMatchObject({
      path: '/v1/promotions',
      error: {
        code: 'BAD_REQUEST',
        message:
          '"value" must be between 1 and 100 for "percentage" promotions',
      },
    });
  });

  it('/v1/promotions (POST) returns 400 for invalid fixed value', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/promotions')
      .set('x-admin-token', TEST_ADMIN_TOKEN)
      .send({
        name: 'Invalid Fixed',
        type: 'fixed',
        value: 0,
        isActive: true,
      })
      .expect(400);
    const body = response.body as ErrorResponseBody;

    expect(body).toMatchObject({
      path: '/v1/promotions',
      error: {
        code: 'BAD_REQUEST',
        message: '"value" must be greater than 0 for "fixed" promotions',
      },
    });
  });

  it('/v1/promotions/:id (PATCH) returns 400 for invalid type/value combinations', async () => {
    const createdPromotion = await createPromotion({
      type: 'fixed',
      value: 150,
      name: 'Type Flip Validation',
    });

    const response = await request(app.getHttpServer())
      .patch(`/v1/promotions/${createdPromotion.id}`)
      .set('x-admin-token', TEST_ADMIN_TOKEN)
      .send({
        type: 'percentage',
      })
      .expect(400);
    const body = response.body as ErrorResponseBody;

    expect(body).toMatchObject({
      path: `/v1/promotions/${createdPromotion.id}`,
      error: {
        code: 'BAD_REQUEST',
        message:
          '"value" must be between 1 and 100 for "percentage" promotions',
      },
    });
  });

  it('/v1/promotions/:id (DELETE) returns 204 and removes promotion', async () => {
    const createdPromotion = await createPromotion();

    await request(app.getHttpServer())
      .delete(`/v1/promotions/${createdPromotion.id}`)
      .set('x-admin-token', TEST_ADMIN_TOKEN)
      .expect(204);

    await request(app.getHttpServer())
      .get(`/v1/promotions/${createdPromotion.id}`)
      .set('x-admin-token', TEST_ADMIN_TOKEN)
      .expect(404);
  });

  it('/v1/promotions/:id (DELETE) returns 404 for missing promotion', async () => {
    const response = await request(app.getHttpServer())
      .delete('/v1/promotions/00000000-0000-0000-0000-000000000000')
      .set('x-admin-token', TEST_ADMIN_TOKEN)
      .expect(404);
    const body = response.body as ErrorResponseBody;

    expect(body).toMatchObject({
      path: '/v1/promotions/00000000-0000-0000-0000-000000000000',
      error: {
        code: 'NOT_FOUND',
        message:
          'Promotion with id "00000000-0000-0000-0000-000000000000" not found',
      },
    });
  });

  it('enforces burst write limits across configured write routes', async () => {
    const assert429Response = (
      response: Response,
      expectedPath: string | RegExp,
    ) => {
      const body = response.body as ErrorResponseBody;

      if (expectedPath instanceof RegExp) {
        expect(body.path).toMatch(expectedPath);
      } else {
        expect(body.path).toBe(expectedPath);
      }

      expect(body.error).toMatchObject({
        code: 'RATE_LIMITED',
        message: 'Too many requests',
      });
      expect(body.timestamp).toBeDefined();

      const retryAfterHeader = response.headers['retry-after'];
      expect(typeof retryAfterHeader).toBe('string');
      expect(Number.parseInt(retryAfterHeader, 10)).toBeGreaterThanOrEqual(1);
    };

    for (
      let attempt = 0;
      attempt < TEST_RATE_LIMIT_MAX_REQUESTS;
      attempt += 1
    ) {
      const response = await request(app.getHttpServer())
        .post('/v1/products')
        .send({
          name: `Rate Limited Product ${attempt}`,
          sku: `RL-PROD-${attempt}`,
          price: 19.99,
          status: 'active',
        });

      expect(response.status).toBe(201);
    }

    const productsBurstResponse = await request(app.getHttpServer())
      .post('/v1/products')
      .send({
        name: 'Rate Limited Product Final',
        sku: 'RL-PROD-FINAL',
        price: 19.99,
        status: 'active',
      });
    expect(productsBurstResponse.status).toBe(429);
    assert429Response(productsBurstResponse, '/v1/products');

    app.get(WriteRateLimitStore).reset();

    for (
      let attempt = 0;
      attempt < TEST_RATE_LIMIT_MAX_REQUESTS;
      attempt += 1
    ) {
      const response = await request(app.getHttpServer())
        .post('/v1/categories')
        .send({
          name: `Rate Limited Category ${attempt}`,
          isActive: true,
        });

      expect(response.status).toBe(201);
    }

    const categoriesBurstResponse = await request(app.getHttpServer())
      .post('/v1/categories')
      .send({
        name: 'Rate Limited Category Final',
        isActive: true,
      });
    expect(categoriesBurstResponse.status).toBe(429);
    assert429Response(categoriesBurstResponse, '/v1/categories');

    app.get(WriteRateLimitStore).reset();

    for (
      let attempt = 0;
      attempt < TEST_RATE_LIMIT_MAX_REQUESTS;
      attempt += 1
    ) {
      const response = await request(app.getHttpServer())
        .post('/v1/promotions')
        .set('x-admin-token', TEST_ADMIN_TOKEN)
        .send({
          name: `Rate Limited Promotion ${attempt}`,
          type: 'percentage',
          value: 10,
          isActive: true,
        });

      expect(response.status).toBe(201);
    }

    const promotionsBurstResponse = await request(app.getHttpServer())
      .post('/v1/promotions')
      .set('x-admin-token', TEST_ADMIN_TOKEN)
      .send({
        name: 'Rate Limited Promotion Final',
        type: 'percentage',
        value: 10,
        isActive: true,
      });
    expect(promotionsBurstResponse.status).toBe(429);
    assert429Response(promotionsBurstResponse, '/v1/promotions');

    app.get(WriteRateLimitStore).reset();

    for (
      let attempt = 0;
      attempt < TEST_RATE_LIMIT_MAX_REQUESTS;
      attempt += 1
    ) {
      const createdOrder = await createOrder({
        status: 'pending',
      });
      const response = await request(app.getHttpServer())
        .post(`/v1/orders/${createdOrder.id}/cancel`)
        .send({
          reason: `Rate-limit cancellation ${attempt}`,
        });

      expect(response.status).toBe(200);
    }

    const finalOrder = await createOrder({
      status: 'pending',
    });
    const ordersBurstResponse = await request(app.getHttpServer())
      .post(`/v1/orders/${finalOrder.id}/cancel`)
      .send({
        reason: 'Rate-limit cancellation final',
      });
    expect(ordersBurstResponse.status).toBe(429);
    assert429Response(ordersBurstResponse, /^\/v1\/orders\/[^/]+\/cancel$/);
  });

  it('keeps read-only GET routes unaffected when write limits are exceeded', async () => {
    for (
      let attempt = 0;
      attempt < TEST_RATE_LIMIT_MAX_REQUESTS;
      attempt += 1
    ) {
      const response = await request(app.getHttpServer())
        .post('/v1/products')
        .send({
          name: `Readable Product ${attempt}`,
          sku: `RL-GET-${attempt}`,
          price: 29.99,
          status: 'active',
        });

      expect(response.status).toBe(201);
    }

    await request(app.getHttpServer())
      .post('/v1/products')
      .send({
        name: 'Readable Product Final',
        sku: 'RL-GET-FINAL',
        price: 29.99,
        status: 'active',
      })
      .expect(429);

    const getResponse = await request(app.getHttpServer())
      .get('/v1/products')
      .expect(200);
    const body = getResponse.body as PaginatedResponseBody<ProductResponseBody>;

    expect(body.meta.total).toBe(TEST_RATE_LIMIT_MAX_REQUESTS);
  });
});
