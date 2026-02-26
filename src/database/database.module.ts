import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createTypeOrmOptions } from './typeorm.config';

@Module({
  imports: [TypeOrmModule.forRoot(createTypeOrmOptions())],
})
export class DatabaseModule {}
