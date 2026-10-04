# Rephora Web

Landing page pública de Rephora. Presenta la propuesta del producto, la biblioteca, los modos de estudio, las métricas y el sistema de progreso.

## Tecnología

- HTML5
- CSS3
- JavaScript sin frameworks
- Contenido localizado en español, inglés, alemán, francés y portugués
- Despliegue estático en Vercel

No requiere compilación ni dependencias para ejecutarse.

## Desarrollo local

Desde la raíz del repositorio:

```bash
python3 -m http.server 4173
```

Después abre `http://localhost:4173`.

## Despliegue

La rama `main` se despliega en producción mediante GitHub Actions y Vercel. Los despliegues automáticos de la integración Git están desactivados, por lo que no se generan previews. El repositorio necesita estos secretos:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

## Licencia

El código y los recursos visuales son propiedad de Smidhus. Consulta [LICENSE](LICENSE).
