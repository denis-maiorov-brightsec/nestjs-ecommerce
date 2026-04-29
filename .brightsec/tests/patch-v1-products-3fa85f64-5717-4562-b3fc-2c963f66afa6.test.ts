import { test, before, after } from 'node:test';
import { SecRunner } from '@sectester/runner';
import { AttackParamLocation, HttpMethod } from '@sectester/scan';

const timeout = 40 * 60 * 1000;
const baseUrl = process.env.BRIGHT_TARGET_URL!;

let runner!: SecRunner;

before(async () => {
  runner = new SecRunner({
    hostname: process.env.BRIGHT_HOSTNAME!,
    projectId: process.env.BRIGHT_PROJECT_ID!
  });

  await runner.init();
});

after(() => runner.clear());

test('PATCH /v1/products/3fa85f64-5717-4562-b3fc-2c963f66afa6', { signal: AbortSignal.timeout(timeout) }, async () => {
  await runner
    .createScan({
      tests: [
        'id_enumeration',
        {
          name: 'broken_access_control',
          options: {
            auth: process.env.BRIGHT_AUTH_ID
          }
        },
        'bopla',
        'xss',
        'html_injection',
        'csrf',
        'proto_pollution',
        'full_path_disclosure',
        'server_side_js_injection',
        'open_database'
      ],
      attackParamLocations: [
        AttackParamLocation.BODY,
        AttackParamLocation.PATH,
        AttackParamLocation.HEADER
      ],
      starMetadata: {
        code_source: 'denis-maiorov-brightsec/nestjs-ecommerce:main',
        databases: ['PostgreSQL'],
        user_roles: []
      },
      poolSize: +process.env.SECTESTER_SCAN_POOL_SIZE || undefined
    })
    .setFailFast(false)
    .timeout(timeout)
    .run({
      method: HttpMethod.PATCH,
      url: `${baseUrl}/v1/products/3fa85f64-5717-4562-b3fc-2c963f66afa6`,
      body: {
        name: 'Laptop Pro',
        stockKeepingUnit: 'LP-001',
        sku: 'LP-001',
        price: 1299.99,
        status: 'active',
        categoryId: 'c-electronics'
      },
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      auth: process.env.BRIGHT_AUTH_ID
    });
});