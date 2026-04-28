Quiero que desarrolles una aplicación web completa para la gestión de reparto de agua (bidones), con enfoque en punto de venta (POS), control de envases y cuentas corrientes de clientes.

### 🧩 STACK TECNOLÓGICO (OBLIGATORIO)
- Framework: Next.js (App Router)
- Lenguaje: TypeScript
- UI: Tailwind CSS + shadcn/ui
- Estado servidor: React Query (TanStack Query)
- Autenticación: NextAuth
- Base de datos: MySQL
- ORM: Prisma

---

### 🎯 OBJETIVO DEL SISTEMA
El sistema debe permitir gestionar la venta y reparto de bidones de agua, llevando control exacto de:
1. Cuántos bidones se entregan
2. Cuántos envases vacíos se recuperan
3. Balance de envases por cliente
4. Cuenta corriente (deuda/pagos) por cliente
5. Operación multi-sucursal

---

### 🏢 MULTISUCURSAL (REQUISITO CRÍTICO)
El sistema debe soportar múltiples sucursales:
- Cada usuario pertenece a una sucursal
- Los datos (ventas, clientes, inventario) están segmentados por sucursal
- Posibilidad de usuarios administradores globales (multi-sucursal)

---

### 👥 ROLES DE USUARIO
- Admin: acceso total, gestión de sucursales, usuarios, reportes globales
- Vendedor: acceso a POS, clientes y operaciones de su sucursal

---

### 📦 MÓDULOS PRINCIPALES

#### 1. Clientes
- Alta, edición y eliminación
- Campos:
  - nombre
  - teléfono
  - dirección
  - sucursal_id
  - saldo_cuenta_corriente
  - envases_en_poder (número de bidones que tiene el cliente)

---

#### 2. Punto de Venta (POS)
Debe permitir registrar una operación de reparto:
- Seleccionar cliente
- Ingresar:
  - cantidad de bidones entregados
  - cantidad de envases vacíos retirados
  - precio unitario
- Calcular automáticamente:
  - total
  - actualización de envases del cliente:
    envases = envases + entregados - retirados
- Registrar la operación como:
  - venta (si genera deuda)
  - pago (si el cliente abona)

---

#### 3. Cuenta Corriente
Por cliente:
- Registro de movimientos:
  - ventas (incrementan deuda)
  - pagos (disminuyen deuda)
- Mostrar:
  - saldo actual
  - historial de movimientos

---

#### 4. Inventario (Básico)
- Control de bidones disponibles por sucursal
- Ajuste automático en cada venta

---

#### 5. Sucursales
- CRUD de sucursales
- Relación con usuarios, clientes e inventario

---

### 🗄️ DISEÑO DE BASE DE DATOS (REQUERIDO)

Genera el esquema en Prisma con las siguientes entidades:

- User
- Branch (Sucursal)
- Client
- Sale (o Transaction)
- SaleDetail (opcional si se maneja más detalle)
- AccountMovement (cuenta corriente)
- Inventory

Relaciones clave:
- User → Branch
- Client → Branch
- Sale → Client
- Sale → Branch
- AccountMovement → Client

---

### ⚙️ LÓGICA CLAVE

Implementar correctamente:

1. Control de envases:
   - Cada venta actualiza el balance de envases del cliente

2. Cuenta corriente:
   - Venta suma deuda
   - Pago resta deuda

3. Aislamiento por sucursal:
   - Ningún usuario puede ver datos de otra sucursal (excepto admin global)

---

### 🎨 UI/UX

- Diseño moderno, limpio y profesional
- Uso de componentes de shadcn/ui
- Dashboard con métricas:
  - ventas del día
  - clientes con deuda
  - envases en circulación
- POS optimizado para rapidez (tipo sistema de caja)

---

### 🔐 AUTENTICACIÓN

- Login con NextAuth
- Protección de rutas por rol
- Persistencia de sesión

---

### 📊 EXTRA (DESEABLE)

- Reportes:
  - ventas por día/sucursal
  - clientes con mayor deuda
- Filtros y búsquedas
- Exportación básica (CSV)

---

### 📁 ESTRUCTURA DEL PROYECTO

Usar arquitectura modular:
- /app (Next.js App Router)
- /components
- /modules (clientes, ventas, inventario, etc.)
- /lib (db, auth, utils)
- /services (API logic)

---

### 🚀 RESULTADO ESPERADO

Entrega:
1. Código funcional completo
2. Esquema Prisma
3. Endpoints/API routes
4. Componentes UI
5. Lógica de negocio implementada correctamente

No omitir detalles críticos de lógica ni simplificar la implementación.