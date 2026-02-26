import { BadRequestException } from '@nestjs/common';
import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
} from '../../common/pagination/pagination.helper';
import { parseOrderFilters, parseOrdersListQuery } from './orders-query.helper';

describe('orders query helper', () => {
  it('uses default pagination when query is empty', () => {
    const parsedQuery = parseOrdersListQuery({});

    expect(parsedQuery.pagination).toEqual({
      page: DEFAULT_PAGE,
      limit: DEFAULT_LIMIT,
      offset: 0,
    });
    expect(parsedQuery.filters).toEqual({});
  });

  it('parses valid status and date filters', () => {
    const filters = parseOrderFilters({
      status: 'paid',
      from: '2025-01-01T00:00:00Z',
      to: '2025-01-02T00:00:00Z',
    });

    expect(filters.status).toBe('paid');
    expect(filters.from?.toISOString()).toBe('2025-01-01T00:00:00.000Z');
    expect(filters.to?.toISOString()).toBe('2025-01-02T00:00:00.000Z');
  });

  it('throws for invalid status filter', () => {
    expect(() => parseOrderFilters({ status: 'draft' })).toThrow(
      BadRequestException,
    );
  });

  it('throws for invalid date filter', () => {
    expect(() => parseOrderFilters({ from: '2025-01-01' })).toThrow(
      BadRequestException,
    );
  });

  it('throws when from is later than to', () => {
    expect(() =>
      parseOrderFilters({
        from: '2025-01-03T00:00:00Z',
        to: '2025-01-02T00:00:00Z',
      }),
    ).toThrow('"from" must be less than or equal to "to"');
  });
});
