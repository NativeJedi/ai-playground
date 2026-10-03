import { TypeOrmModule } from '@nestjs/typeorm';

// Hardcoded to match the `postgres` service in docker-compose.yml.
export const DatabaseModule = TypeOrmModule.forRoot({
  type: 'postgres',
  host: 'postgres',
  port: 5432,
  username: 'postgres',
  password: 'postgres',
  database: 'playground',
  // Picks up every entity registered through TypeOrmModule.forFeature().
  autoLoadEntities: true,
  // Playground only: creates/alters tables from entities on startup.
  synchronize: true,
});
