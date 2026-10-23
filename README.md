# Mi Diario

Web personal en español con tres categorías exclusivas: videojuegos (VidaExtra), política de izquierda (selección de elDiario.es, sección Política) y baloncesto (Mundo Deportivo). Usa RSS gratuitos sin cuentas ni claves. La selección de medio no clasifica ideológicamente cada artículo.

## Abrir con doble clic

Abre `Abrir web.cmd`. Inicia el servidor de noticias en segundo plano y abre la web automáticamente. No uses Live Server: solo sirve archivos y no ejecuta la ruta de noticias.

## Abrir en local

Con Node.js 22 o superior, desde esta carpeta:

```
node scripts/preview.mjs
```

Abre http://127.0.0.1:3210/index.html. La página principal editable es `index.html`, en la raíz del proyecto. Al abrirla con doble clic verás el diseño; para cargar noticias debes iniciar el servidor. No necesita instalar dependencias. La conexión del servidor a los medios debe permitir HTTPS.

## Comprobar y construir

```
node --test tests/news.test.mjs
node scripts/build.mjs
```

El servidor exporta un Worker ESM en `worker/index.js`. El build integra el contenido de `index.html` en el Worker y copia el manifiesto a `dist/`. La ruta `/api/news?category=juegos` acepta también `politica` y `baloncesto`.

Las fuentes se consultan en servidor con tiempo límite de 12 segundos y caché de hasta cinco minutos por instancia. El botón Actualizar vuelve a consultar esta caché. Si la fuente falla, se muestran datos previos cuando existen en esa instancia o un aviso con enlace al medio. Nunca se generan noticias de muestra. El filtro Solo de hoy usa Europe/Madrid. La última categoría se guarda en este navegador.

RSS de origen: https://www.vidaextra.com/index.xml · https://www.eldiario.es/rss/politica/ · https://www.mundodeportivo.com/feed/rss/baloncesto

Se muestran titulares, extractos disponibles, fechas, imágenes disponibles y enlaces al original. La disponibilidad de los canales y las imágenes depende del medio. No se usan las APIs de pago ni Steam, que requiere seleccionar juegos concretos.

## Nuevas categorías

Inteligencia artificial: RSS temático de Xataka. Informática: RSS de Genbeta filtrado por términos de software, sistemas, programación y seguridad. Proyectos con IA: API pública de Algolia para Show HN, sin clave; publicaciones relacionadas con IA, con al menos 50 votos y publicadas en los últimos 90 días, ordenadas por puntos. Se muestran votos y enlace a la conversación para contextualizar la popularidad. Los títulos son los originales en inglés. Show HN identifica proyectos presentados por sus creadores; no certifica qué herramientas usaron para construirlos.

## Avances tecnológicos

La antigua sección Informática se amplía a Avances tecnológicos: Xataka general, sus canales de computación cuántica y semiconductores, y Microsiervos. Selecciona avances e innovación en hardware, robótica, computación, energía, materiales y otros campos tecnológicos; excluye titulares de ofertas y descuentos. Ordena por fecha y elimina enlaces duplicados.
