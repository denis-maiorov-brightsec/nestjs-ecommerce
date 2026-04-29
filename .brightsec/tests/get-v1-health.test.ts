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

test('GET /v1/health', { signal: AbortSignal.timeout(timeout) }, async () => {
  await runner
    .createScan({
      tests: [
        'improper_asset_management',
        'http_method_fuzzing',
        'csrf',
        'secret_tokens',
        'open_database'
      ],
      attackParamLocations: [AttackParamLocation.HEADER],
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
      method: HttpMethod.GET,
      url: `${baseUrl}/v1/health`,
      headers: {
        Accept: 'application/json',
        Host: 'example.com',
        'User-Agent': 'curl/7.86.0',
        'x-request-id': '123e4567-e89b-12d3-a456-426614174000'
      },
      auth: process.env.BRIGHT_AUTH_ID
    });
});