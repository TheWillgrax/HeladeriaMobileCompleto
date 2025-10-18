<h1 align="center">🍨 Helados Victoria — App móvil y API Express</h1>

![Demo App](/mobile/assets/images/screenshot-for-readme.png)

Helados Victoria es una plataforma completa para administrar una heladería moderna:

- 👩‍🍳 Catálogo editable de helados, paletas y malteadas.
- 🛒 Carrito persistente por usuario y flujo de checkout.
- 🔐 Registro, inicio de sesión con JWT y perfiles de clientes/administradores.
- 🧾 Panel administrativo para monitorear pedidos y activar/desactivar productos.
- 📱 Aplicación móvil construida con React Native + Expo Router.
- ⚙️ API REST en Express conectada a MySQL.

---

## 🧪 Variables de entorno

### Backend (`/backend`)

Crea un archivo `.env` con los siguientes valores:

```bash
PORT=5001
DB_HOST=localhost
DB_PORT=3306
DB_USER=tu_usuario
DB_PASSWORD=tu_password
DB_NAME=heladeria_db
JWT_SECRET=tu_secreto_super_seguro
NODE_ENV=development
ADMIN_EMAIL=admin@helados.com
ADMIN_PASSWORD=una_contraseña_segura
# Opcionalmente personaliza el nombre y teléfono del administrador
# ADMIN_NAME=Helados Admin
# ADMIN_PHONE=5551234567
```

Al iniciar el servidor, si `ADMIN_EMAIL` y `ADMIN_PASSWORD` están definidos se creará (o actualizará) automáticamente una cuenta administrativa con esas credenciales.

### Mobile (`/mobile`)

Configura la URL base de la API (por defecto usa `http://localhost:5001/api`):

```bash
EXPO_PUBLIC_API_URL=http://localhost:5001/api
```

---

## 🔧 Inicializar la base de datos

Ejecuta el script SQL proporcionado para crear el esquema y los datos iniciales:

```sql
-- Ver archivo de la petición original para el script completo
```

---

## 🚀 Levantar el backend

```bash
cd backend
npm install
npm run dev
```

> Si la instalación falla por políticas de red, genera el `package-lock.json` manualmente o instala los paquetes en tu entorno local.

---

## 📱 Ejecutar la app móvil

```bash
cd mobile
npm install
npx expo start
```

Abre el enlace en Expo Go o en un emulador para probar la experiencia móvil.

---

## 🧰 Scripts útiles

| Ubicación | Comando | Descripción |
|-----------|---------|-------------|
| backend   | `npm run dev` | Ejecuta el API con nodemon. |
| backend   | `npm run start` | Ejecuta el API en modo producción. |
| mobile    | `npm run android` | Lanza Expo apuntando a un emulador Android. |
| mobile    | `npm run ios` | Lanza Expo en el simulador de iOS. |
| mobile    | `npm run web` | Vista previa web de la app móvil. |

---

## 🧱 Stack técnico

- **Backend:** Node.js, Express, mysql2, JWT, bcrypt.
- **Frontend móvil:** React Native 0.79, Expo Router 5, Context API.
- **Autenticación:** JWT almacenado de forma segura con `expo-secure-store`.
- **Estado global:** Contextos personalizados para auth y carrito.
- **UI:** Estilo pastel inspirado en heladerías artesanales.

---

## ✅ Roadmap futuro

- Integración de pasarela de pago.
- Gestión avanzada de inventario (promociones, cupones).
- Notificaciones push cuando un pedido cambie de estado.

¡Disfruta creando experiencias dulces con Helados Victoria! 🍧
