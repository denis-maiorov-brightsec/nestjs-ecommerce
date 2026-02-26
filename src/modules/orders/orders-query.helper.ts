import { BadRequestException } from '@nestjs/common';
import {
  PaginationParams,
  PaginationQuery,
  parsePaginationQuery,
} from '../../common/pagination/pagination.helper';
import { isOrderStatus, ORDER_STATUSES, OrderStatus } from './order-status';

type QueryValue = string | number | string[] | number[] | null | undefined;
const ISO_TIMESTAMP_REGEX =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

export interface OrdersListQuery extends PaginationQuery {
  status?: QueryValue;
  from?: QueryValue;
  to?: QueryValue;
}

export interface OrderFilters {
  status?: OrderStatus;
  from?: Date;
  to?: Date;
}

export interface ParsedOrdersListQuery {
  filters: OrderFilters;
  pagination: PaginationParams;
}

export function parseOrdersListQuery(
  query: OrdersListQuery,
): ParsedOrdersListQuery {
  const pagination = parsePaginationQuery(query);
  const filters = parseOrderFilters(query);
  return { filters, pagination };
}

export function parseOrderFilters(query: OrdersListQuery): OrderFilters {
  const status = parseStatus(query.status);
  const from = parseIsoTimestamp(query.from, 'from');
  const to = parseIsoTimestamp(query.to, 'to');

  if (from && to && from > to) {
    throw new BadRequestException('"from" must be less than or equal to "to"');
  }

  return { status, from, to };
}

function parseStatus(value: QueryValue): OrderStatus | undefined {
  const normalizedValue = parseSingleStringValue(value, 'status');
  if (!normalizedValue) {
    return undefined;
  }

  if (!isOrderStatus(normalizedValue)) {
    throw new BadRequestException(
      `"status" must be one of: ${ORDER_STATUSES.join(', ')}`,
    );
  }

  return normalizedValue;
}

function parseIsoTimestamp(
  value: QueryValue,
  field: 'from' | 'to',
): Date | undefined {
  const normalizedValue = parseSingleStringValue(value, field);
  if (!normalizedValue) {
    return undefined;
  }

  if (!ISO_TIMESTAMP_REGEX.test(normalizedValue)) {
    throw new BadRequestException(`"${field}" must be a valid ISO timestamp`);
  }

  const parsedDate = new Date(normalizedValue);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new BadRequestException(`"${field}" must be a valid ISO timestamp`);
  }

  return parsedDate;
}

function parseSingleStringValue(
  value: QueryValue,
  field: 'status' | 'from' | 'to',
): string | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (Array.isArray(value)) {
    throw new BadRequestException(`"${field}" must be a string`);
  }

  if (typeof value !== 'string') {
    throw new BadRequestException(`"${field}" must be a string`);
  }

  return value;
}
