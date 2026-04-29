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

test('GET /v1/orders', { signal: AbortSignal.timeout(timeout) }, async () => {
  await runner
    .createScan({
      tests: [
        'date_manipulation',
        'business_constraint_bypass',
        'id_enumeration',
        {
          name: 'broken_access_control',
          options: {
            auth: process.env.BRIGHT_AUTH_ID
          }
        },
        'proto_pollution',
        'nosql',
        'sqli',
        'xss',
        'full_path_disclosure'
      ],
      attackParamLocations: [AttackParamLocation.QUERY, AttackParamLocation.HEADER],
      starMetadata: {
        code_source: 'denis-maiorov-brightsec/nestjs-ecommerce:main',
        databases: ['PostgreSQL'],
        user_roles: []
      },
      poolSize: +process.env.SECTESTER_SCAN_POOL_SIZE || undefined,
      skipStaticParams: false
    })
    .setFailFast(false)
    .timeout(timeout)
    .run({
      method: HttpMethod.GET,
      url: `${baseUrl}/v1/orders?from=2026-01-01T00%3A00%3A00.000Z&limit=20&page=1&status=paid&to=2026-01-31T23%3A59%3A59.000Z`,
      auth: process.env.BRIGHT_AUTH_ID
    });
});