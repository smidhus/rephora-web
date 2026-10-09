# Rephora Web

Landing page pública de Rephora. Presenta la propuesta del producto, la biblioteca, los modos de estudio, las métricas y el sistema de progreso.

## Tecnología

- HTML5
- CSS3
- JavaScript sin frameworks
- Contenido localizado en español, inglés, alemán, francés y portugués
- Generación estática de una URL indexable por idioma
- Despliegue estático en Vercel

La raíz usa inglés como idioma predeterminado. Las demás versiones se publican en `/es/`, `/pt/`, `/de/` y `/fr/`.

Cada versión genera su propio `canonical`, metadatos localizados y referencias `hreflang`. La portada también publica un grafo JSON-LD que relaciona el sitio Rephora, la aplicación móvil y Smidhus como publicador.

## Instalación

```bash
npm install
```

## Compilación

```bash
npm run build
npm run check
```

El resultado estático se genera en `dist/`. El contenido y el diseño se mantienen en `index.html`, mientras que `scripts/build.mjs` produce las cinco variantes a partir de las traducciones existentes en `app.js`.

## Desarrollo local

Desde la raíz del repositorio:

```bash
npm run build
python3 -m http.server 4173 --directory dist
```

Después abre `http://localhost:4173`.

## Despliegue

Vercel despliega directamente la rama `main`. La configuración en `vercel.json` ejecuta `npm run build` y publica `dist/`; no se utiliza un workflow de GitHub Actions.

## Licencia

El código y los recursos visuales son propiedad de Smidhus. Consulta [LICENSE](LICENSE).
