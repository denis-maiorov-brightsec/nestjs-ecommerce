import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return { status: 'ok' };
  }

  getDeprecatedRootMessage() {
    return {
      message:
        'This unversioned endpoint is deprecated. Please migrate to /v1/health.',
    };
  }
}
