/**
 * Editorial Loader
 * Scans src/data/editorials/ for pre-rendered editorial HTML and metadata using Vite's import.meta.glob.
 * Edge-compatible (no node:fs).
 */

export interface Editorial {
  slug: string;
  title: string;
  author: string;
  date: string;
  abstract: string;
  tags: string[];
  draft: boolean;
  layout?: string;
  cover?: string;
  html: string;
}

/**
 * Load all editorials from the data directory.
 * Each editorial is a folder with meta.json + content.html.
 */
export function loadEditorials(): Editorial[] {
  const metaFiles = import.meta.glob('../data/editorials/**/meta.json', { eager: true });
  const htmlFiles = import.meta.glob('../data/editorials/**/content.html', { eager: true, query: '?raw', import: 'default' });

  const editorials: Editorial[] = [];

  for (const path in metaFiles) {
    const slugMatch = path.match(/editorials\/(.+)\/meta\.json$/);
    if (!slugMatch) continue;
    
    const slug = slugMatch[1];
    const htmlPath = `../data/editorials/${slug}/content.html`;
    
    const metaModule = metaFiles[path] as any;
    const meta = metaModule.default || metaModule;
    const html = htmlFiles[htmlPath] as string;

    if (!html) {
      console.warn(`[editorial-loader] Skipping "${slug}": missing content.html`);
      continue;
    }

    if (meta.draft) continue;

    editorials.push({
      slug,
      title: meta.title || slug,
      author: meta.author || '',
      date: meta.date || '',
      abstract: meta.abstract || '',
      tags: meta.tags || [],
      draft: !!meta.draft,
      layout: meta.layout,
      cover: meta.cover,
      html
    });
  }

  // Load Native Markdown Editorials
  const mdFiles = import.meta.glob('../data/editorials/**/*.md', { eager: true });
  for (const path in mdFiles) {
    const mod = mdFiles[path] as any;
    const frontmatter = mod.frontmatter || {};
    
    if (frontmatter.draft) continue;

    // Extract slug from path (e.g. '../data/editorials/jailsh/main.md' -> 'jailsh')
    const parts = path.split('/');
    let slug = parts[parts.length - 2];
    if (parts[parts.length - 1] !== 'index.md' && parts[parts.length - 1] !== 'main.md') {
      slug = parts[parts.length - 1].replace('.md', '');
    }

    editorials.push({
      slug,
      title: frontmatter.title || slug,
      author: frontmatter.author || '',
      date: frontmatter.date || '',
      abstract: frontmatter.abstract || '',
      tags: frontmatter.tags || [],
      draft: !!frontmatter.draft,
      layout: frontmatter.layout_type || 'single',
      cover: frontmatter.cover,
      html: '' // MD is rendered natively in [...slug].astro, so we don't need raw html here
    });
  }

  // Sort by date descending (newest first)
  return editorials.sort((a, b) => {
    const da = new Date(a.date).getTime();
    const db = new Date(b.date).getTime();
    return db - da;
  });
}

/**
 * Get a single editorial by slug
 */
export function getEditorial(slug: string): Editorial | undefined {
  return loadEditorials().find(e => e.slug === slug);
}
