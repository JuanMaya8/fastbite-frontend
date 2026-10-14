# 🛵 FastBite — Frontend (React + gRPC-Web)

Página web de **FastBite**, una app de domicilios con seguimiento del pedido en vivo. Proyecto de la materia **Programación Orientada a la Web**.

Este es el repo del **frontend**. Necesita el backend (repo `fastbite-backend`) corriendo para funcionar.

---

## ¿Qué hace?

- Muestra el menú (llamada gRPC *unary* `ListMenu`).
- Arma el carrito y crea el pedido (`CreateOrder`).
- Muestra el seguimiento **en vivo** usando *server streaming* (`TrackOrder`): el servidor empuja cada cambio de estado y la pantalla se actualiza sola, sin polling.
- Permite cancelar el pedido antes de que salga el repartidor (`CancelOrder`).

Los navegadores no pueden hablar gRPC "puro", así que usa **gRPC-Web** (`@connectrpc/connect-web`). El cliente está completamente tipado porque se **genera desde el archivo `.proto`**.

---

## Estructura

```
fastbite-frontend/
├── proto/                    ← Contrato gRPC (copia propia de este repo)
│   ├── buf.yaml
│   └── fastbite/v1/delivery.proto
├── src/
│   ├── api.ts                ← Cliente gRPC-Web tipado
│   ├── App.tsx               ← Menú, carrito y formulario
│   ├── Tracker.tsx           ← Seguimiento en vivo (consume el stream)
│   ├── main.tsx
│   └── styles.css
├── buf.gen.yaml              ← Config del generador de código
├── index.html
└── package.json
```

La carpeta `src/gen` (código generado) **no se sube a git**: se crea sola con `npm run dev` / `npm run build`.

---

## Cómo correrlo en tu computador

**Necesitas:** Node.js 20 o superior (`node -v`) e internet para `npm install`. No hace falta instalar `protoc`.

1. Levanta primero el **backend** (ver el README de `fastbite-backend`): debe quedar en <http://localhost:8080>.
2. En este repo:

```bash
npm install
npm run dev
```

3. Abre <http://localhost:5173>, agrega cosas al carrito, pon tu nombre y dirección y pulsa **Place order**. 🎉

Por defecto busca el backend en `http://localhost:8080`, así que localmente no configuras nada.

### Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Genera el código desde el `.proto` y abre el servidor de desarrollo |
| `npm run build` | Genera el código, revisa tipos y construye `dist/` |
| `npm run preview` | Sirve el build localmente |
| `npm run generate` | Solo regenera el código desde el `.proto` |

### Variable de entorno

| Variable | Para qué sirve | Ejemplo |
|---|---|---|
| `VITE_API_URL` | URL del backend. Si no la defines usa `http://localhost:8080` | `https://fastbite-backend.onrender.com` |

> Las variables `VITE_*` se "queman" en el build. Si la cambias en Vercel, hay que **redesplegar**.

---

## Desplegar en Vercel

1. Sube este repo a GitHub.
2. Despliega primero el **backend** en Render y copia su URL.
3. En <https://vercel.com> → **Add New → Project** → importa este repo.
4. Configura:

| Campo | Valor |
|---|---|
| Framework Preset | `Vite` |
| Root Directory | *(déjalo vacío: el frontend es la raíz del repo)* |
| Build Command | `npm run build` (el de por defecto) |
| Output Directory | `dist` (el de por defecto) |

5. En **Environment Variables** agrega `VITE_API_URL` = la URL de Render, **sin `/` al final**.
6. **Deploy** y copia la URL final (ej. `https://fastbite.vercel.app`).
7. **Importante:** ve a Render → servicio del backend → **Environment** y agrega `CORS_ORIGIN` = esa URL de Vercel (sin `/` final). Sin esto el navegador bloquea las llamadas por CORS.

> Las URLs de *preview* de Vercel (las de cada rama) son distintas a la principal. Si quieres probar con ellas, agrégalas a `CORS_ORIGIN` separadas por coma.

---

## ⚠️ Mantener el contrato sincronizado con el backend

Este repo y el del backend tienen **cada uno su copia** de `proto/fastbite/v1/delivery.proto`. Si el backend cambia el contrato:

1. Copia el `.proto` actualizado a `proto/fastbite/v1/delivery.proto` de este repo.
2. Corre `npm run generate` (o `npm run dev`) y corrige lo que TypeScript marque.
3. Haz commit.

---

## Si algo falla

| Síntoma | Causa probable |
|---|---|
| "Cannot reach the server…" | El backend no está corriendo, `VITE_API_URL` está mal, o en el plan gratis de Render el servidor se está despertando (espera ~1 minuto y recarga) |
| Error de **CORS** en la consola del navegador | Falta o está mal `CORS_ORIGIN` en Render (URL exacta de Vercel, con `https://` y sin `/` final) |
| Cambié `VITE_API_URL` en Vercel y no hace efecto | Hay que redesplegar: la variable se incrusta al construir |
| El build falla con un error de tipos tras cambiar el `.proto` | Las copias del `.proto` están desincronizadas entre repos |
