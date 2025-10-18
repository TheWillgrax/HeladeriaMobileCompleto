# Helados Victoria Mobile

Aplicación móvil construida con React Native + Expo para la heladería Helados Victoria. Permite a los clientes explorar el catálogo, administrar su carrito y revisar pedidos, mientras que los administradores supervisan órdenes e inventario.

## Características principales

- Registro, inicio/cierre de sesión con JWT almacenado en `expo-secure-store`.
- Navegación con Expo Router y tabs personalizadas.
- Catálogo dinámico conectado al backend Express.
- Carrito sincronizado con la API y flujo de checkout.
- Panel administrativo (solo usuarios `admin`) para pedidos e inventario.

## Configuración

1. Instala dependencias:

   ```bash
   npm install
   ```

2. Crea un archivo `.env` o usa variables de entorno Expo:

   ```bash
   EXPO_PUBLIC_API_URL=http://localhost:5001/api
   ```

3. Ejecuta el proyecto:

   ```bash
   npx expo start
   ```

## Estructura destacada

- `app/_layout.jsx`: envuelve la app con los contextos de autenticación y carrito.
- `app/(auth)`: pantallas de acceso (`login` y `register`).
- `app/(tabs)`: navegación principal (Inicio, Carta, Carrito, Admin).
- `contexts/AuthContext.jsx`: maneja sesión, registro y perfil.
- `contexts/CartContext.jsx`: gestiona estado y acciones del carrito.
- `services/api.js`: cliente HTTP centralizado para la API de Express.

## Notas

- El color principal y acentos están definidos en `constants/colors.js`.
- La mayoría de los componentes antiguos de recetas se eliminaron para simplificar la base de código.
- Para habilitar el panel admin, asigna el rol `admin` a un usuario desde la base de datos.
