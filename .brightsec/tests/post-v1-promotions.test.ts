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

test('POST /v1/promotions', { signal: AbortSignal.timeout(timeout) }, async () => {
  await runner
    .createScan({
      tests: [
        {
          name: 'broken_access_control',
          options: {
            auth: process.env.BRIGHT_AUTH_ID
          }
        },
        'xss',
        'html_injection',
        {
          name: 'date_manipulation',
          options: {
            skipStaticParams: false
          }
        },
        'secret_tokens',
        'bopla',
        'open_database',
        'nosql',
        'csrf'
      ],
      attackParamLocations: [AttackParamLocation.BODY, AttackParamLocation.HEADER],
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
      method: HttpMethod.POST,
      url: `${baseUrl}/v1/promotions`,
      body: {
        name: 'Spring Sale 2026',
        type: 'percentage',
        value: 15,
        isActive: true,
        startsAt: '2026-04-01T00:00:00.000Z',
        endsAt: '2026-04-30T23:59:59.999Z'
      },
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'x-admin-token': 'admintoken_01a2b3c4'
      },
      auth: process.env.BRIGHT_AUTH_ID
    });
});