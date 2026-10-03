import { TypeOrmModule } from '@nestjs/typeorm';

// Hardcoded to match the `postgres` service in docker-compose.yml.
export const DatabaseModule = TypeOrmModule.forRoot({
  type: 'postgres',
  host: 'postgres',
  port: 5432,
  username: 'postgres',
  password: 'postgres',
  database: 'playground',
});
