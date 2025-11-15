# bibliotecaFront

Frontend en Angular para la biblioteca digital.

## Desarrollo

Para iniciar el servidor de desarrollo local:

```bash
npm start
```

El servidor estará disponible en `http://localhost:4200/`.

## Build

Para construir el proyecto para producción:

```bash
npm run build:prod
```

Para desarrollo:

```bash
npm run build:dev
```

## Configuración

El proyecto utiliza archivos de environment para diferentes configuraciones:
- `src/environments/environment.ts` - Desarrollo
- `src/environments/environment.prod.ts` - Producción

Asegúrate de configurar la URL base de la API en estos archivos.
