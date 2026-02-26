import { BadRequestException } from '@nestjs/common';

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

type PaginationValue = string | number | string[] | number[] | null | undefined;

export interface PaginationQuery {
  page?: PaginationValue;
  limit?: PaginationValue;
}

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  hasNext: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export function parsePaginationQuery(query: PaginationQuery): PaginationParams {
  const page = parsePositiveInteger(query.page, 'page', DEFAULT_PAGE);
  const requestedLimit = parsePositiveInteger(
    query.limit,
    'limit',
    DEFAULT_LIMIT,
  );
  const limit = Math.min(requestedLimit, MAX_LIMIT);

  return {
    page,
    limit,
    offset: (page - 1) * limit,
  };
}

export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  pagination: Pick<PaginationParams, 'page' | 'limit'>,
): PaginatedResponse<T> {
  return {
    data,
    meta: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      hasNext: pagination.page * pagination.limit < total,
    },
  };
}

function parsePositiveInteger(
  value: PaginationValue,
  field: 'page' | 'limit',
  defaultValue: number,
): number {
  if (value === undefined || value === null || value === '') {
    return defaultValue;
  }

  if (Array.isArray(value)) {
    throw new BadRequestException(`"${field}" must be a positive integer`);
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new BadRequestException(`"${field}" must be a positive integer`);
  }

  return parsed;
}
