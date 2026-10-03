import { ConfigModule } from '@nestjs/config';

// Resolved from the backend/ directory, where every app is started.
// In Docker the file is absent and variables come from the container env.
const ROOT_ENV_FILE = '../.env';

export const RootEnvModule = ConfigModule.forRoot({
  isGlobal: true,
  envFilePath: ROOT_ENV_FILE,
});
