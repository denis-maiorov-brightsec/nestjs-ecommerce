import { DataSource } from 'typeorm';
import { createDataSourceOptions } from './typeorm.config';

const AppDataSource = new DataSource(createDataSourceOptions());

export default AppDataSource;
