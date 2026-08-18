import { APP_GUARD } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule, type TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'node:path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BillsModule } from './bills/bills.module';
import { CheckoutModule } from './checkout/checkout.module';
import { CustomersModule } from './customers/customers.module';
import { DeliveriesModule } from './deliveries/deliveries.module';
import { TransactionsModule } from './transactions/transactions.module';
import { ProductsModule } from './products/products.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            limit: Number(configService.get<string>('THROTTLE_LIMIT', '60')),
            ttl: Number(configService.get<string>('THROTTLE_TTL_MS', '60000')),
          },
        ],
      }),
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: Number(configService.get<string>('DB_PORT', '5432')),
        username: configService.get<string>('DB_USERNAME', 'admin'),
        password: configService.get<string>('DB_PASSWORD', 'password123'),
        database: configService.get<string>('DB_NAME', 'ferret-db'),
        ssl:
          configService.get<string>('DB_SSL', 'false') === 'true'
            ? {
                rejectUnauthorized:
                  configService.get<string>(
                    'DB_SSL_REJECT_UNAUTHORIZED',
                    'true',
                  ) === 'true',
              }
            : false,
        autoLoadEntities: true,
        synchronize: false,
        migrations: [join(__dirname, 'database/migrations/*{.js,.ts}')],
        migrationsRun: true,
        retryAttempts: 10,
        retryDelay: 3000,
      }),
    }),
    ProductsModule,
    CustomersModule,
    BillsModule,
    CheckoutModule,
    DeliveriesModule,
    TransactionsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
