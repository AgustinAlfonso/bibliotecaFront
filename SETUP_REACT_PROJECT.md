# Guía Paso a Paso: Crear Proyecto React para Migración

## Paso 1: Crear el Proyecto con Vite

Abre una terminal en el directorio `front` (donde está la carpeta `biblioteca`):

```bash
# Navegar al directorio front (si no estás ahí)
cd C:\Users\Agustin\Downloads\libros\Biblioteca_Combo_2015.05.27_30.026\front

# Crear proyecto React con Vite + TypeScript
npm create vite@latest biblioteca-react -- --template react-ts
```

Esto creará una nueva carpeta `biblioteca-react` con la estructura base de React + TypeScript.

## Paso 2: Navegar al Proyecto e Instalar Dependencias

```bash
cd biblioteca-react
npm install
```

## Paso 3: Instalar Dependencias Adicionales

Instala las dependencias que necesitarás para la migración:

```bash
# Para peticiones HTTP (opcional, puedes usar fetch nativo)
npm install axios

# Para routing (si lo necesitas más adelante)
npm install react-router-dom

# Tipos para TypeScript
npm install --save-dev @types/node
```

## Paso 4: Verificar la Estructura del Proyecto

Tu proyecto debería verse así:

```
biblioteca-react/
├── public/
│   └── vite.svg
├── src/
│   ├── assets/
│   ├── App.css
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   └── vite-env.d.ts
├── .gitignore
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

## Paso 5: Configurar la Estructura de Carpetas

Crea la estructura de carpetas que necesitarás:

```bash
# En Windows PowerShell
mkdir src\components
mkdir src\components\Books
mkdir src\services
mkdir src\hooks
mkdir src\utils
mkdir src\types
mkdir public\assets
mkdir public\assets\images
```

O manualmente desde el explorador de archivos.

## Paso 6: Copiar Assets

Copia la imagen del logo desde el proyecto Angular:

```bash
# Copiar la imagen del logo
copy ..\biblioteca\public\assets\images\libros.png public\assets\images\libros.png
```

O cópiala manualmente desde:
- **Origen**: `biblioteca/public/assets/images/libros.png`
- **Destino**: `biblioteca-react/public/assets/images/libros.png`

## Paso 7: Configurar Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto:

```bash
# Crear archivo .env
echo VITE_API_BASE_URL=https://cheque-defined-diesel-these.trycloudflare.com > .env
```

O crea manualmente el archivo `.env` con este contenido:

```
VITE_API_BASE_URL=https://cheque-defined-diesel-these.trycloudflare.com
```

**Nota**: En Vite, las variables de entorno deben empezar con `VITE_` para ser accesibles en el código.

## Paso 8: Crear Archivo de Configuración de API

Crea `src/utils/config.ts`:

```typescript
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || window.location.origin;

console.log('[Config] API base URL =>', API_BASE_URL);
```

## Paso 9: Actualizar el HTML Principal

Edita `index.html` para que tenga el título correcto:

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>La Totalidad De Todo Lo Jamás Escrito</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

## Paso 10: Configurar TypeScript (Opcional)

Edita `tsconfig.json` para ajustar la configuración si es necesario:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

## Paso 11: Probar que Todo Funciona

Ejecuta el servidor de desarrollo:

```bash
npm run dev
```

Deberías ver algo como:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

Abre `http://localhost:5173/` en tu navegador. Deberías ver la página de React por defecto.

## Paso 12: Limpiar el Código Inicial

Opcionalmente, puedes limpiar `src/App.tsx` para empezar desde cero:

```typescript
function App() {
  return (
    <div>
      <h1>Biblioteca React</h1>
      <p>Migración en progreso...</p>
    </div>
  );
}

export default App;
```

## Paso 13: Verificar Scripts en package.json

Tu `package.json` debería tener estos scripts:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview"
  }
}
```

## Resumen de Comandos (Todo en Uno)

```bash
# 1. Crear proyecto
cd C:\Users\Agustin\Downloads\libros\Biblioteca_Combo_2015.05.27_30.026\front
npm create vite@latest biblioteca-react -- --template react-ts

# 2. Instalar dependencias
cd biblioteca-react
npm install

# 3. Instalar dependencias adicionales
npm install axios react-router-dom
npm install --save-dev @types/node

# 4. Crear estructura de carpetas (PowerShell)
mkdir src\components, src\components\Books, src\services, src\hooks, src\utils, src\types, public\assets\images

# 5. Copiar assets
copy ..\biblioteca\public\assets\images\libros.png public\assets\images\libros.png

# 6. Crear .env (crear manualmente o con echo)
# Contenido: VITE_API_BASE_URL=https://cheque-defined-diesel-these.trycloudflare.com

# 7. Probar
npm run dev
```

## Próximos Pasos

Una vez que tengas el proyecto funcionando:

1. ✅ Crear el servicio de API (`src/services/api.ts`)
2. ✅ Crear los tipos TypeScript (`src/types/index.ts`)
3. ✅ Crear hooks personalizados (`src/hooks/useBooks.ts`, etc.)
4. ✅ Migrar el componente Books
5. ✅ Migrar los estilos CSS

## Notas Importantes

- **Vite** es mucho más rápido que Create React App
- Las variables de entorno deben empezar con `VITE_` para ser accesibles
- El proyecto usa TypeScript estricto por defecto
- El hot reload funciona automáticamente durante el desarrollo

## Troubleshooting

### Error: "Cannot find module"
- Ejecuta `npm install` nuevamente
- Verifica que estás en el directorio correcto

### Error: "Variable de entorno no definida"
- Asegúrate de que las variables empiecen con `VITE_`
- Reinicia el servidor de desarrollo después de cambiar `.env`

### Puerto ya en uso
- Vite usa el puerto 5173 por defecto
- Si está ocupado, Vite te sugerirá otro puerto automáticamente

