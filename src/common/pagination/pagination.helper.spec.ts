import { BadRequestException } from '@nestjs/common';
import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  MAX_LIMIT,
  parsePaginationQuery,
} from './pagination.helper';

describe('parsePaginationQuery', () => {
  it('uses default page and limit when query is empty', () => {
    const pagination = parsePaginationQuery({});

    expect(pagination).toEqual({
      page: DEFAULT_PAGE,
      limit: DEFAULT_LIMIT,
      offset: 0,
    });
  });

  it('throws for page less than or equal to zero', () => {
    expect(() => parsePaginationQuery({ page: '0' })).toThrow(
      BadRequestException,
    );
  });

  it('caps limit to max limit when requested limit is greater than max', () => {
    const pagination = parsePaginationQuery({
      page: '1',
      limit: String(MAX_LIMIT + 1),
    });

    expect(pagination).toEqual({
      page: 1,
      limit: MAX_LIMIT,
      offset: 0,
    });
  });

  it('throws for non-numeric pagination values', () => {
    expect(() => parsePaginationQuery({ limit: 'abc' })).toThrow(
      BadRequestException,
    );
  });
});
