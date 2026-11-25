# softparade cells · tienda online

Frontend estático + Supabase (cuentas, base de datos, fotos) + 2 funciones de Netlify (pagos con Mercado Pago). Todo gratis para empezar.

## Puesta en marcha (en este orden)

### 1. Supabase (base de datos y cuentas)
1. Creá una cuenta en **supabase.com** y un proyecto nuevo (guardá la contraseña de la base).
2. Menú **SQL Editor** > New query > pegá el contenido de `supabase.sql` > **Run**.
3. **Project Settings > API**: copiá `Project URL` y la clave `anon public` y pegalas en `js/config.js`. Cambiá también el número de WhatsApp.
4. Opcional, para simplificar: **Authentication > Providers > Email** y desactivá "Confirm email".
5. Copiá también la clave `service_role` (¡secreta! no va en ningún archivo, solo en el paso 3).

### 2. Mercado Pago
1. Creá tu cuenta en **mercadopago.com.ar** y entrá a **mercadopago.com.ar/developers**.
2. Tus integraciones > Crear aplicación > Checkout Pro.
3. Copiá el **Access Token**. Empezá con el de **prueba** y cuando todo funcione cambiá al de producción.

### 3. GitHub
Subí la carpeta a un repositorio (igual que hiciste con el portafolio: `git init`, `add`, `commit`, `push`).

### 4. Netlify (publica el sitio y las funciones)
1. En **netlify.com**: Add new site > Import an existing project > elegí tu repositorio. No cambies nada y apretá Deploy.
2. **Site configuration > Environment variables**, agregá:
   - `SUPABASE_URL`: la URL del proyecto
   - `SUPABASE_SERVICE_KEY`: la clave service_role
   - `MP_ACCESS_TOKEN`: el token de Mercado Pago
   - `SITE_URL`: la dirección de tu sitio en Netlify, sin barra final (ej. `https://softparade.netlify.app`)
3. **Deploys > Trigger deploy > Deploy site** para que tome las variables.
4. En Supabase: **Authentication > URL Configuration**, poné tu dirección de Netlify en Site URL.

### 5. Tu usuario administrador
1. Entrá a tu sitio, apretá Ingresar > Crear cuenta con tu email.
2. En Supabase > SQL Editor ejecutá (con tu email):
   `insert into admins values ('tu@email.com');`
3. Entrá a `tu-sitio/admin.html`. Desde ahí cargás productos con foto, ves pedidos y marcás los enviados, y gestionás reparaciones.

## Uso diario
- **Agregar un producto:** admin.html > Productos > completás el formulario. Aparece en la tienda al instante, sin tocar código.
- **Pedidos:** aparecen como "Pendiente" y pasan a "Pagado" solos cuando Mercado Pago confirma. Marcá "Enviado" cuando lo despaches.
- **Stock:** se ajusta a mano desde "Precio/stock".

## Personalización
- Colores: variables al inicio de `css/style.css`.
- Textos y "Sobre nosotros": `index.html`.
- Logo: `img/logo.svg`.

## Probar pagos
Con el token de prueba de Mercado Pago usá las tarjetas de prueba de su documentación (sección "Tarjetas de prueba").

## Actualización: historial, stock automático y emails
1. **Supabase**: ejecutá `supabase-actualizacion.sql` en el SQL Editor (una sola vez).
2. **Emails (Brevo, gratis)**: creá cuenta en **brevo.com**, verificá tu email como remitente (Senders) y generá una API key (SMTP & API > API Keys).
3. **Netlify > Environment variables**, agregá: `BREVO_API_KEY`, `MAIL_FROM` (el email verificado en Brevo) y `MAIL_ADMIN` (donde querés recibir el aviso de cada venta). Luego Trigger deploy.
- Los clientes ven su historial en el botón "Mis pedidos".
- Al aprobarse un pago, el pedido pasa a "Pagado", se descuenta el stock y se envían los emails (al cliente y a vos).
- Al marcar "Enviado" en el panel admin, el cliente recibe un aviso.
- Si no configurás Brevo, todo funciona igual pero sin emails.
