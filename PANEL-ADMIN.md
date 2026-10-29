# Panel de administración de Ekovozia

## Puesta en marcha (una sola vez)

1. **Base de datos D1**: en Cloudflare, Storage & Databases > D1 > Create database (nombre: `ekovozia`).
2. **Enlazarla al Worker**: Worker > Settings > Bindings > Add > D1 database. Variable name: `DB`, elige `ekovozia`.
3. **Clave del panel**: Worker > Settings > Variables and Secrets > añade el secreto `ADMIN_TOKEN` con una clave larga y aleatoria.
4. (Opcional) Secreto `HASH_SALT`: texto aleatorio para la huella de IP. Si no existe se usa ADMIN_TOKEN.
5. Sube el nuevo `worker.js` (versión 3.9) al Worker y despliega.
6. Sube a Pages: `index.html`, `acerca.html`, `analytics.js`, `account.js` y `admin.html`.
7. Abre `https://ekovozia.pages.dev/admin`, escribe la clave y listo. Las tablas se crean solas.

## Qué registra (solo si la persona acepta las cookies)

Página, origen, país/ciudad/región aproximados y operador (por Cloudflare), dispositivo, sistema, navegador, pantalla,
idioma, zona horaria, tiempo activo, páginas vistas, mensajes (sin contenido), uso del micrófono, modelo elegido,
búsqueda web y consejo de IAs, visitante nuevo o recurrente. La IP no se guarda, solo una huella irreversible.
Borrado automático a los 180 días.

## Notas

- Sin consentimiento no se crea ninguna cookie ni se envía nada. El enlace «Cookies» de la web permite cambiar la elección.
- `/track` admite 120 peticiones por minuto y IP; `/admin/stats`, 20.
- Si cambias el dominio de la web, actualiza `ALLOWED_ORIGIN` en el worker.
