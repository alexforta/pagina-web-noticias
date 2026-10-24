export const CATEGORY_LABELS = {juegos:'Videojuegos',politica:'Política de izquierda',baloncesto:'Baloncesto',ia:'Inteligencia artificial',informatica:'Avances tecnológicos',proyectos:'Proyectos de la comunidad'};

export function combineNews(groups) {
  const articles = new Map();
  for (const group of groups) for (const article of group.articles) {
    const key = article.url.replace(/#.*$/, '');
    const existing = articles.get(key);
    if (existing) existing.categories = [...new Set([...existing.categories, article.category])];
    else articles.set(key, {...article, categories:[article.category]});
  }
  return [...articles.values()];
}

// A transparent fallback; this is not a semantic assessment by an AI model.
export function selectRecent(articles, now = Date.now()) {
  return articles.map(article => {
    const age = Math.max(0, (now - Date.parse(article.publishedAt || '')) / 3600000);
    const recency = Number.isFinite(age) ? Math.max(0, 60 - age) : 0;
    const impact = /\b(ley|elecciones|gobierno|guerra|crisis|seguridad|vulnerabilidad|descubrimiento|avance|récord|final|campeón|lanzamiento)\b/i.test(article.title) ? 15 : 0;
    return {...article, selectionScore:recency + impact, selectionReason:impact ? 'Actualidad con señales de impacto en el titular. Selección automática sin IA.' : 'Priorizada por fecha de publicación. Selección automática sin IA.'};
  }).sort((a,b) => b.selectionScore-a.selectionScore);
}

export function applyAnalysis(articles, assessments) {
  if (!Array.isArray(assessments) || assessments.length !== articles.length) throw Error('El análisis no cubre todas las noticias.');
  const byId = new Map();
  for (const entry of assessments) {
    if (!Number.isInteger(entry.id) || entry.id < 0 || entry.id >= articles.length || byId.has(entry.id) || !Number.isFinite(entry.score) || entry.score < 0 || entry.score > 100 || typeof entry.reason !== 'string' || !entry.reason.trim()) throw Error('El análisis recibido no es válido.');
    byId.set(entry.id, entry);
  }
  return articles.map((article,id) => ({...article, importance:byId.get(id).score, analysisReason:byId.get(id).reason.slice(0,600)})).sort((a,b) => b.importance-a.importance || Date.parse(b.publishedAt||0)-Date.parse(a.publishedAt||0));
}
