import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';

const toNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const isTrue = (value: string | undefined): boolean =>
  (value ?? '').toLowerCase() === 'true';

const resolveSynchronize = (): boolean => {
  if (process.env.DB_SYNCHRONIZE !== undefined) {
    return isTrue(process.env.DB_SYNCHRONIZE);
  }

  return process.env.NODE_ENV !== 'production';
};

const baseOptions = () => ({
  type: 'postgres' as const,
  host: process.env.DB_HOST ?? 'localhost',
  port: toNumber(process.env.DB_PORT, 5432),
  username: process.env.DB_USERNAME ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? 'nestjs_ecommerce',
  logging: isTrue(process.env.DB_LOGGING),
});

export const createTypeOrmOptions = (): TypeOrmModuleOptions => ({
  ...baseOptions(),
  autoLoadEntities: true,
  synchronize: resolveSynchronize(),
});

export const createDataSourceOptions = (): DataSourceOptions => ({
  ...baseOptions(),
  synchronize: false,
  entities: [`${__dirname}/../**/*.entity{.ts,.js}`],
  migrations: [`${__dirname}/migrations/*{.ts,.js}`],
});
