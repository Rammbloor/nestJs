import { join } from 'node:path';
import { appConfig, databaseConfig } from '@infra/config/config';
import { AppConfigModule } from '@infra/config/config.module';
import type { ConfigType } from '@nestjs/config';
import { EnvironmentConstant } from '@shared/constants';
import { validate } from '@shared/helpers';
import { DataSource, DataSourceOptions } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import {
   addTransactionalDataSource,
   deleteDataSourceByName,
   getDataSourceByName,
} from 'typeorm-transactional';

function buildOptions(
   database: ConfigType<typeof databaseConfig>,
   app: ConfigType<typeof appConfig>,
): DataSourceOptions {
   return {
      type: 'postgres',
      host: database.host,
      port: database.port,
      username: database.user,
      password: database.password,
      database: database.name,

      entities: [join(__dirname, '../**/*.entity{.ts,.js}')],
      migrations: [join(__dirname, 'migrations/*.{ts,js}')],
      synchronize: false,
      migrationsRun: true,
      migrationsTableName: 'typeorm_migrations',
      namingStrategy: new SnakeNamingStrategy(),
      logging: app.env === EnvironmentConstant.DEVELOPMENT,
   };
}

export const typeOrmConfig = {
   imports: [AppConfigModule],
   inject: [databaseConfig.KEY, appConfig.KEY],
   useFactory: (database: ConfigType<typeof databaseConfig>, app: ConfigType<typeof appConfig>) =>
      buildOptions(database, app),
   dataSourceFactory: async (options: DataSourceOptions) => {
      const existingDataSource = getDataSourceByName('default');

      if (existingDataSource?.isInitialized) {
         return existingDataSource;
      }

      if (existingDataSource && !existingDataSource.isInitialized) {
         deleteDataSourceByName('default');
      }

      return addTransactionalDataSource(new DataSource(options));
   },
};

validate(process.env as Record<string, unknown>);

export default new DataSource(buildOptions(databaseConfig(), appConfig()));
