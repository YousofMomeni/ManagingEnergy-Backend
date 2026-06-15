// src/app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule, type TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MapModule } from './map/map.module';
import { StationModule } from './station/station.module';
import { UserModule } from './user/user.module';
import { GroupModule } from './group/group.module';
import { UsageModule } from './usage/usage.module';
import { GetDataModule } from './get-data/get-data.module';
import { AuthModule } from './auth/auth.module';
import { ParametersModule } from './parameters/parameters.module';
import { DataLoggingModule } from './data-logging/data-logging.module';
import { ModbusProxyModule } from './modbus-proxy/modbus-proxy.module';
import configuration from './config/configuration';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Load our custom configuration file
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => ({
        type: 'better-sqlite3',
        // Use the database path from our config file
        database: configService.get<string>(
          'backend.databasePath',
          'database.sqlite',
        ),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true,
      }),
      inject: [ConfigService],
    }),
    MapModule,
    StationModule,
    UserModule,
    GroupModule,
    UsageModule,
    GetDataModule,
    AuthModule,
    ParametersModule,
    DataLoggingModule,
    ModbusProxyModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
