# Mi Diario

Web personal en español con seis categorías y una selección «Más importantes» que las reúne: videojuegos, política de izquierda, baloncesto, inteligencia artificial, avances tecnológicos y proyectos de la comunidad. Usa fuentes gratuitas. La selección de medio no clasifica ideológicamente cada artículo.

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
node --test tests/*.test.mjs
node scripts/build.mjs
```

El servidor exporta un Worker ESM en `worker/index.js`. El build integra el contenido de `index.html` en el Worker y copia el manifiesto a `dist/`. La ruta `/api/news?category=juegos` acepta también `politica` y `baloncesto`.

## Más importantes

«Más importantes» reúne los artículos recibidos de las seis categorías, elimina enlaces repetidos y muestra hasta 30 destacados, priorizados por fecha y señales de relevancia en el titular. No se genera un análisis general con IA ni se muestran puntuaciones.

## Leer resúmenes

Al pulsar el título, la imagen o «Leer resumen», el resumen se abre en una ventana flotante sobre el diario, sin cambiar de página ni perder la posición. Se cierra con la X superior derecha, Escape o pulsando fuera, y devuelve el foco a la noticia. La ruta `/noticia` se mantiene para enlaces directos. El servidor local busca la noticia entre las fuentes recibidas, intenta leer los párrafos accesibles del medio y prepara con la cuenta local de ChatGPT un resumen breve en español y puntos clave. La página conserva el tema claro u oscuro y ofrece enlaces para volver al diario o abrir expresamente el artículo original.

Solo se descargan artículos HTTPS de los medios conocidos; se comprueban también las redirecciones y se limita el tamaño de descarga. No se saltan restricciones de acceso. Cuando el texto no está disponible, se indica que el resumen usa únicamente titular y extracto. Si falla ChatGPT, se muestra el extracto original identificado. Los resúmenes se reutilizan durante 24 horas en la misma sesión del servidor.

Las fuentes se consultan en servidor con tiempo límite de 12 segundos y caché de hasta cinco minutos por instancia. El botón Actualizar vuelve a consultar esta caché. Si la fuente falla, se muestran datos previos cuando existen en esa instancia o un aviso con enlace al medio. Nunca se generan noticias de muestra. El filtro Solo de hoy usa Europe/Madrid. La última categoría se guarda en este navegador.

RSS de origen: https://www.vidaextra.com/index.xml · https://www.eldiario.es/rss/politica/ · https://www.mundodeportivo.com/feed/rss/baloncesto

Se muestran titulares, extractos disponibles, fechas, imágenes disponibles y enlaces al original. La disponibilidad de los canales y las imágenes depende del medio. No se usan las APIs de pago ni Steam, que requiere seleccionar juegos concretos.

## Nuevas categorías

Inteligencia artificial: RSS temático de Xataka. Informática: RSS de Genbeta filtrado por términos de software, sistemas, programación y seguridad. Proyectos de la comunidad: API pública de Algolia para Show HN, sin clave; proyectos de cualquier temática, con al menos 50 puntos y publicadas en los últimos 90 días, ordenadas por puntos. Se muestran votos y enlace a la conversación para contextualizar la popularidad. Los titulares se traducen al español. Show HN identifica proyectos presentados por sus creadores; no se exige que hayan utilizado IA.

## Avances tecnológicos

La antigua sección Informática se amplía a Avances tecnológicos: Xataka general, sus canales de computación cuántica y semiconductores, y Microsiervos. Selecciona avances e innovación en hardware, robótica, computación, energía, materiales y otros campos tecnológicos; excluye titulares de ofertas y descuentos. Ordena por fecha y elimina enlaces duplicados.

Los resúmenes de Proyectos de la comunidad consultan el README público cuando el enlace original es un repositorio de GitHub; para otras webs leen su contenido y hasta dos enlaces de documentación del mismo sitio. Si no hay texto accesible, intentan recuperar la presentación del creador en Show HN. La ventana muestra las fuentes consultadas. Este lector verifica que el destino y sus redirecciones usen HTTPS y direcciones públicas, fija la dirección DNS comprobada para la conexión y limita el tamaño descargado. El resumen explica qué es la herramienta, para qué sirve y sus funciones documentadas, sin completar datos ausentes con suposiciones.

Las tarjetas de Proyectos de la comunidad cargan imágenes del sitio original (Open Graph o Twitter) y capturas del README en GitHub. En repositorios se priorizan capturas o demos frente a logos e insignias. Las imágenes se resuelven al mostrarse la tarjeta, con caché de 24 horas; si no hay una imagen disponible, se conserva la portada alternativa.

Los titulares de Proyectos de la comunidad se traducen automáticamente al español manteniendo marcas y nombres de proyectos. La misma traducción aparece en la tarjeta y en el resumen. El original se conserva en los datos y las traducciones se guardan en .sites-runtime/title-translations.json para reutilizarlas tras reiniciar. Si falla la traducción, se muestra un aviso y se conserva el título original.

El selector Ordenar permite mostrar primero las noticias más nuevas o las más antiguas, en todas las categorías y en Favoritos. Las noticias sin fecha aparecen al final. La preferencia se recuerda en el navegador. Cada tarjeta tiene un botón Guardar/Guardada; la sección Favoritos conserva una copia local de las noticias elegidas y permite eliminarlas con el mismo botón. Se guardan en localStorage de este navegador y no se sincronizan entre dispositivos. Las noticias guardadas pueden seguir solicitando su resumen aunque ya no aparezcan en el RSS.
