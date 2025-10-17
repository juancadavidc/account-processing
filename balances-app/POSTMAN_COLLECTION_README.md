# BMAD Bank Deposits - Postman Collection

Esta colección de Postman contiene todas las pruebas necesarias para el sistema BMAD Bank Deposits, una aplicación que procesa transacciones bancarias colombianas a través de SMS y webhooks estructurados.

## 📁 Archivos Incluidos

- `BMAD-Bank-Deposits-API.postman_collection.json` - Colección principal de Postman
- `BMAD-Bank-Deposits-Environment.postman_environment.json` - Variables de entorno
- `POSTMAN_COLLECTION_README.md` - Esta documentación

## 🚀 Configuración Inicial

### 1. Importar la Colección

1. Abre Postman
2. Haz clic en "Import" en la esquina superior izquierda
3. Selecciona los archivos:
   - `BMAD-Bank-Deposits-API.postman_collection.json`
   - `BMAD-Bank-Deposits-Environment.postman_environment.json`

### 2. Configurar Variables de Entorno

La colección incluye variables predefinidas que puedes modificar según tu entorno:

| Variable | Valor por Defecto | Descripción |
|----------|-------------------|-------------|
| `baseUrl` | `http://localhost:3000` | URL base de la API |
| `webhookSecret` | `test-webhook-secret` | Secreto de autenticación |
| `testEmail` | `jdcadavid96@gmail.com` | Email de prueba |
| `testPhone` | `+573001234567` | Teléfono de prueba |
| `testAmount` | `190000` | Monto de transacción de prueba |
| `testUserId` | `user_123e4567-e89b-12d3-a456-426614174000` | ID de usuario de prueba |
| `testSourceId` | `src_123e4567-e89b-12d3-a456-426614174000` | ID de fuente de prueba |

## 📋 Estructura de la Colección

### 1. Health Checks
- **V2 API Health Check**: Verifica el estado de la API V2

### 2. V1 SMS Webhook API
Endpoints para el procesamiento de SMS de Bancolombia:

- **CORS Preflight**: Solicitud OPTIONS para CORS
- **Process SMS Webhook - Valid Deposit**: Procesa un depósito válido
- **Process SMS Webhook - Invalid Message**: Prueba mensajes inválidos
- **Process SMS Webhook - Duplicate**: Prueba manejo de duplicados
- **Process SMS Webhook - Missing Auth**: Prueba autenticación faltante
- **Process SMS Webhook - Invalid Auth**: Prueba autenticación inválida

### 3. V2 Structured Webhook API
Endpoints para el procesamiento de transacciones estructuradas:

- **CORS Preflight**: Solicitud OPTIONS para CORS
- **Process V2 Webhook - Bancolombia Deposit**: Depósito de Bancolombia
- **Process V2 Webhook - Nequi Transfer**: Transferencia de Nequi
- **Process V2 Webhook - Daviplata Withdrawal**: Retiro de Daviplata
- **Process V2 Webhook - Invalid Validation**: Prueba validación inválida
- **Process V2 Webhook - Duplicate**: Prueba duplicados V2
- **Process V2 Webhook - Missing Auth**: Prueba autenticación faltante
- **Process V2 Webhook - Invalid Auth**: Prueba autenticación inválida
- **Process V2 Webhook - Large Payload**: Prueba límite de tamaño (20KB)

### 4. Error Scenarios
Pruebas de escenarios de error:

- **Invalid JSON Payload**: Payload JSON inválido
- **Wrong Content-Type**: Tipo de contenido incorrecto
- **Old Timestamp**: Timestamp muy antiguo

### 5. Performance Tests
Pruebas de rendimiento:

- **Rapid Fire Requests**: Solicitudes rápidas consecutivas

### 6. Sources Management API
Endpoints para gestionar fuentes de transacciones:

- **CORS Preflight**: Solicitud OPTIONS para CORS
- **Get Sources for User**: Obtener fuentes de un usuario
- **Get Source by ID**: Obtener fuente específica por ID
- **Create Email Source**: Crear fuente de email
- **Create Phone Source**: Crear fuente de teléfono
- **Create Webhook Source**: Crear fuente de webhook
- **Create Source - Invalid Type**: Prueba validación de tipo inválido
- **Create Source - Missing Fields**: Prueba campos faltantes

### 7. User-Source Relationships API
Endpoints para gestionar asociaciones usuario-fuente:

- **CORS Preflight**: Solicitud OPTIONS para CORS
- **Get Users for Source**: Obtener usuarios de una fuente
- **Associate User with Source**: Asociar usuario con fuente
- **Associate User with Source - Duplicate**: Prueba duplicados
- **Associate User with Source - Missing Fields**: Prueba campos faltantes
- **Remove User-Source Association**: Desasociar usuario de fuente
- **Remove User-Source Association - Missing Parameters**: Prueba parámetros faltantes

## 🔧 Uso de la Colección

### Ejecutar Pruebas Individuales

1. Selecciona una carpeta (ej: "V1 SMS Webhook API")
2. Haz clic en una solicitud específica
3. Verifica las variables de entorno
4. Haz clic en "Send"

### Ejecutar Todas las Pruebas

1. Haz clic derecho en la colección "BMAD Bank Deposits API"
2. Selecciona "Run collection"
3. Configura las opciones de ejecución
4. Haz clic en "Run BMAD Bank Deposits API"

### Usar Variables Dinámicas

La colección incluye scripts pre-request que generan automáticamente:

```javascript
// Timestamp actual
pm.globals.set('timestamp', new Date().toISOString());

// ID único de webhook
pm.globals.set('webhookId', 'webhook_' + Date.now() + '_' + Math.floor(Math.random() * 1000));
```

## 📊 Ejemplos de Payloads

### V1 SMS Webhook (Bancolombia)

```json
{
  "message": "Bancolombia te informa que se ha realizado un abono por $190,000 a tu cuenta de ahorros **7251 el 15/01/2024 a las 14:30. Saldo disponible: $2,500,000. No respondas este mensaje.",
  "timestamp": "2024-01-15T14:30:00.000Z",
  "phone": "+573001234567",
  "webhookId": "webhook_1234567890"
}
```

### V2 Structured Webhook (Bancolombia)

```json
{
  "source": "bancolombia",
  "timestamp": "2024-01-15T14:30:00.000Z",
  "sourceFrom": "bancolombia@noreply.com",
  "sourceTo": "jdcadavid96@gmail.com",
  "event": "deposit",
  "message": "Bancolombia te informa que se ha realizado un abono por $190,000 a tu cuenta de ahorros **7251 el 15/01/2024 a las 14:30. Saldo disponible: $2,500,000. No respondas este mensaje.",
  "amount": 190000,
  "currency": "COP",
  "webhookId": "v2_webhook_1234567890",
  "metadata": {
    "accountNumber": "**7251",
    "senderName": "Juan Pérez",
    "reference": "TRF-123456789"
  }
}
```

### V2 Structured Webhook (Nequi)

```json
{
  "source": "nequi",
  "timestamp": "2024-01-15T14:30:00.000Z",
  "sourceFrom": "+573001234567",
  "sourceTo": "+573009876543",
  "event": "transfer",
  "message": "Nequi: Recibiste $50,000 de María García. Tu saldo: $1,200,000. No responder.",
  "amount": 50000,
  "currency": "COP",
  "webhookId": "v2_webhook_1234567890",
  "metadata": {
    "senderName": "María García",
    "reference": "NQ-987654321"
  }
}
```

## 🔐 Autenticación

Todos los endpoints requieren autenticación Bearer token:

```
Authorization: Bearer test-webhook-secret
```

## 📈 Respuestas Esperadas

### Respuesta Exitosa (V1)

```json
{
  "status": "processed",
  "transactionId": "123e4567-e89b-12d3-a456-426614174000",
  "webhookId": "webhook_1234567890"
}
```

### Respuesta Exitosa (V2)

```json
{
  "status": "processed",
  "transactionId": "123e4567-e89b-12d3-a456-426614174000",
  "webhookId": "v2_webhook_1234567890",
  "sourceId": "src_123e4567-e89b-12d3-a456-426614174000"
}
```

### Respuesta de Error

```json
{
  "status": "error",
  "error": "Parse failed: Invalid SMS format",
  "webhookId": "webhook_1234567890"
}
```

### Respuesta de Duplicado

```json
{
  "status": "duplicate",
  "transactionId": "123e4567-e89b-12d3-a456-426614174000",
  "webhookId": "webhook_1234567890"
}
```

## 🧪 Casos de Prueba Incluidos

### Casos de Éxito
- ✅ Procesamiento de depósitos de Bancolombia
- ✅ Procesamiento de transferencias de Nequi
- ✅ Procesamiento de retiros de Daviplata
- ✅ Manejo de duplicados
- ✅ Validación de timestamps
- ✅ Gestión de fuentes (email, teléfono, webhook)
- ✅ Asociación de usuarios con fuentes
- ✅ Consulta de relaciones usuario-fuente

### Casos de Error
- ❌ Mensajes SMS inválidos
- ❌ Payloads JSON malformados
- ❌ Autenticación faltante o inválida
- ❌ Timestamps muy antiguos
- ❌ Payloads demasiado grandes
- ❌ Validación de campos requeridos

### Casos de Rendimiento
- ⚡ Solicitudes rápidas consecutivas
- ⚡ Límites de tamaño de payload
- ⚡ Timeouts de base de datos

## 🔄 Flujo de Pruebas Recomendado

1. **Configuración**: Importar colección y entorno
2. **Health Check**: Verificar que la API esté funcionando
3. **Pruebas V1**: Ejecutar casos de SMS webhook
4. **Pruebas V2**: Ejecutar casos de webhook estructurado
5. **Pruebas de Error**: Verificar manejo de errores
6. **Pruebas de Rendimiento**: Validar límites y timeouts

## 📝 Notas Importantes

- La colección está configurada para desarrollo local (`localhost:3000`)
- Para producción, actualiza las variables de entorno correspondientes
- Los webhook IDs se generan automáticamente para evitar duplicados
- Los timestamps se generan automáticamente en formato ISO
- La colección incluye ejemplos de respuesta para cada endpoint

## 🛠️ Personalización

Puedes personalizar la colección modificando:

1. **Variables de entorno**: Para diferentes entornos (dev, staging, prod)
2. **Payloads de prueba**: Para probar diferentes escenarios
3. **Scripts pre-request**: Para generar datos dinámicos
4. **Tests**: Para validaciones automáticas de respuestas

## 📞 Soporte

Para preguntas o problemas con la colección de Postman, consulta la documentación del proyecto o contacta al equipo de desarrollo.
