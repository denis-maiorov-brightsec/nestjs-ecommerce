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

test('GET /v1/categories', { signal: AbortSignal.timeout(timeout) }, async () => {
  await runner
    .createScan({
      tests: [
        'business_constraint_bypass',
        'xss',
        'html_injection',
        'id_enumeration'
      ],
      attackParamLocations: [AttackParamLocation.HEADER],
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
      method: HttpMethod.GET,
      url: `${baseUrl}/v1/categories`,
      headers: { Accept: 'application/json' },
      auth: process.env.BRIGHT_AUTH_ID
    });
});