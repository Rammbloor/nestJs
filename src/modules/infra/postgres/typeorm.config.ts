import { join } from 'node:path';
import { AppConfigModule } from '@infra/config/config.module';
import { AppConfigService } from '@infra/config/config.service';
import { ConfigService } from '@nestjs/config';
import { EnvironmentConstant } from '@shared/constants';
import { type EnvironmentVariables, validate } from '@shared/helpers';
import { DataSource, DataSourceOptions } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import {
   addTransactionalDataSource,
   deleteDataSourceByName,
   getDataSourceByName,
} from 'typeorm-transactional';

function buildOptions(configService: AppConfigService): DataSourceOptions {
   return {
      type: 'postgres',
      host: configService.dbHost,
      port: configService.dbPort,
      username: configService.dbUser,
      password: configService.dbPassword,
      database: configService.dbName,

      entities: [join(__dirname, '../**/*.entity{.ts,.js}')],
      migrations: [join(__dirname, 'migrations/*.{ts,js}')],
      synchronize: false,
      migrationsRun: true,
      migrationsTableName: 'typeorm_migrations',
      namingStrategy: new SnakeNamingStrategy(),
      logging: configService.appEnv === EnvironmentConstant.DEVELOPMENT,
   };
}

export const typeOrmConfig = {
   imports: [AppConfigModule],
   inject: [AppConfigService],
   useFactory: (configService: AppConfigService) => buildOptions(configService),
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

const cliConfigService = new AppConfigService(
   new ConfigService<EnvironmentVariables, true>(validate(process.env as Record<string, unknown>)),
);

export default new DataSource(buildOptions(cliConfigService));
