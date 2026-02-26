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

    await migrationDataSource.query(
      'TRUNCATE TABLE "products", "categories", "orders" RESTART IDENTITY CASCADE',
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
});
