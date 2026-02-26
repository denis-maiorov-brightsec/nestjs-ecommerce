import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, VersioningType } from '@nestjs/common';
import { Module } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppController } from './../src/app.controller';
import { AppService } from './../src/app.service';

@Module({
  controllers: [AppController],
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
    app.enableVersioning({
      type: VersioningType.URI,
    });
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
});
