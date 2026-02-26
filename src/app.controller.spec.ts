import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return deprecated migration message', () => {
      expect(appController.getDeprecatedRootMessage()).toEqual({
        message:
          'This unversioned endpoint is deprecated. Please migrate to /v1/health.',
      });
    });
  });

  describe('health', () => {
    it('should return ok status', () => {
      expect(appController.getHealth()).toEqual({ status: 'ok' });
    });
  });
});
