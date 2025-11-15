# Guía de Deploy en Vercel

## Pasos para deployar

1. **Conecta tu repositorio a Vercel:**
   - Ve a [vercel.com](https://vercel.com)
   - Inicia sesión con GitHub
   - Importa el repositorio `bibliotecaFront`

2. **Configuración del proyecto:**
   - Framework: Angular (se detecta automáticamente)
   - Build Command: `npm run build:prod`
   - Output Directory: `dist/biblioteca/browser`
   - Install Command: `npm install`

3. **Configurar la URL del backend:**
   - Antes de hacer deploy, edita `src/environments/environment.prod.ts`
   - Reemplaza `'https://tu-backend-url-aqui.com'` con la URL real de tu backend en Cloudflare
   - Haz commit y push de este cambio

4. **Variables de entorno (opcional):**
   - Si prefieres usar variables de entorno, puedes configurarlas en Vercel
   - Pero necesitarás modificar el código para leerlas en tiempo de build

5. **Deploy:**
   - Vercel detectará automáticamente los cambios en `main`
   - Cada push a `main` generará un nuevo deploy automático

## Notas importantes

- El archivo `vercel.json` ya está configurado
- Asegúrate de actualizar la URL del backend antes del primer deploy
- Vercel usará el build de producción automáticamente

