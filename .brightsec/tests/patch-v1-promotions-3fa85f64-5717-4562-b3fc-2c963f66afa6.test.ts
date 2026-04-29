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

test('PATCH /v1/promotions/3fa85f64-5717-4562-b3fc-2c963f66afa6', { signal: AbortSignal.timeout(timeout) }, async () => {
  await runner
    .createScan({
      tests: [
        {
          name: 'broken_access_control',
          options: {
            auth: process.env.BRIGHT_AUTH_ID
          }
        },
        'secret_tokens',
        'id_enumeration',
        'bopla',
        'date_manipulation',
        'csrf',
        'xss',
        'html_injection'
      ],
      attackParamLocations: [
        AttackParamLocation.BODY,
        AttackParamLocation.HEADER,
        AttackParamLocation.PATH
      ],
      skipStaticParams: false,
      starMetadata: {
        code_source: 'denis-maiorov-brightsec/nestjs-ecommerce:main',
        databases: [
          'PostgreSQL'
        ],
        user_roles: []
      },
      poolSize: +process.env.SECTESTER_SCAN_POOL_SIZE || undefined
    })
    .setFailFast(false)
    .timeout(timeout)
    .run({
      method: HttpMethod.PATCH,
      url: `${baseUrl}/v1/promotions/3fa85f64-5717-4562-b3fc-2c963f66afa6`,
      body: {
        name: 'Spring Sale 2026',
        type: 'percentage',
        value: 15,
        isActive: true,
        startsAt: '2026-05-01T00:00:00Z',
        endsAt: '2026-05-31T23:59:59Z'
      },
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'x-admin-token': 'admin-secret-token-abc123'
      },
      auth: process.env.BRIGHT_AUTH_ID
    });
});