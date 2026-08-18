# Backend

API de checkout construida con NestJS, TypeScript, TypeORM y PostgreSQL.

## Requisitos

- Node.js 20+
- PostgreSQL 15+ o Docker Desktop
- Credenciales de Sandbox del proveedor de pagos

## Instalacion

```bash
npm install
```

Desde la raiz del proyecto, inicia PostgreSQL:

```bash
docker compose up -d db
```

## Variables De Entorno

Copia `.env.example` como `.env`. Para el desarrollo local actual:

```env
NODE_ENV=development
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=admin
DB_PASSWORD=password123
DB_NAME=ferret-db
DB_SSL=false
DB_SSL_REJECT_UNAUTHORIZED=true
CORS_ORIGINS=http://localhost:5173
THROTTLE_TTL_MS=60000
THROTTLE_LIMIT=60
WOMPI_API_BASE_URL=https://api-sandbox.co.uat.wompi.dev/v1
WOMPI_PUBLIC_KEY=tu_llave_publica_sandbox
WOMPI_PRIVATE_KEY=tu_llave_privada_sandbox
WOMPI_INTEGRITY_KEY=tu_llave_integridad_sandbox
WOMPI_TIMEOUT_MS=10000
WOMPI_POLL_INTERVAL_MS=1000
WOMPI_POLL_ATTEMPTS=10
```

Nunca subas `.env` al repositorio. La llave privada y la llave de integridad solo deben existir en el backend.

Para AWS RDS usa el endpoint de la instancia, conserva `DB_PORT=5432` y activa `DB_SSL=true`. En el Security Group permite TCP `5432` únicamente desde la IP o red privada donde se ejecutará el backend.

## Ejecucion

```bash
npm run start:dev
```

La API queda disponible en:

```text
http://localhost:5000
```

Swagger:

```text
http://localhost:5000/docs
```

OpenAPI JSON:

```text
http://localhost:5000/docs-json
```

## Flujo Del Checkout

1. `GET /products` obtiene los productos sembrados y el stock disponible.
2. El frontend solicita los datos de entrega y tarjeta.
3. El frontend tokeniza la tarjeta directamente con Sandbox usando la llave publica.
4. El frontend conserva solo el token `tok_*`, marca de tarjeta y ultimos cuatro digitos.
5. `POST /checkout/prepare` crea cliente, factura pendiente, detalle, entrega, transaccion pendiente y reserva stock.
6. `POST /checkout/:transactionId/charge` recibe solamente el token `tok_*`, llama al proveedor Sandbox y finaliza la transaccion.
7. `GET /checkout/:transactionId/status` consulta el estado local.
8. Si el pago es aprobado, se descuenta stock y se libera la reserva.
9. Si es rechazado, se libera la reserva y se cancela la entrega pendiente.

## Tarjetas Sandbox

Usa estos datos solo en Sandbox:

| Marca | Numero | Resultado esperado |
| --- | --- | --- |
| Visa | `4242 4242 4242 4242` | Aprobada |
| Mastercard | `5555 5555 5555 4444` | Aprobada |
| Visa | `4111 1111 1111 1111` | Rechazada |

Para las pruebas usa:

```text
Nombre: Cliente Sandbox
Vencimiento: 12/30
CVV: 123
Cuotas: 1
```

El numero completo, CVV y vencimiento nunca se envian a este backend.

## Arquitectura Tecnica

```text
CheckoutController
        |
CheckoutService (caso de uso de aplicacion)
        |
PaymentProviderPort
        |
WompiClient (adaptador HTTP externo)
```

- Los controllers solo reciben HTTP y delegan.
- `CheckoutService` contiene la orquestacion del caso de uso.
- `PaymentProviderPort` desacopla la aplicacion del proveedor externo.
- `WompiClient` es el adaptador concreto de Sandbox.
- TypeORM maneja persistencia, migraciones y transacciones atomicas.
- `Result<T, E>` y `fromPromise()` hacen explicitos los resultados y errores del proveedor.

## Modelo De Datos

```text
customers 1 ---- N bills
bills 1 -------- N bill_items N -------- 1 products
bills 1 -------- 0..1 deliveries
bills 1 -------- N transactions
```

Productos y clientes tienen borrado logico. Facturas, entregas y transacciones conservan historial.

## Pruebas

```bash
npm test
npm run test:cov
```

Resultado actual: **86 pruebas pasando** y **81.55% de cobertura de lineas** en la cobertura funcional configurada.

## Scripts

```bash
npm run build
npm run lint
npm run start:dev
npm test
npm run test:cov
```
