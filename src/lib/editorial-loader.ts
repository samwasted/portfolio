/**
 * Editorial Loader
 * Scans src/data/editorials/ for pre-rendered editorial HTML and metadata.
 * No pandoc dependency — just reads files committed to git.
 */

import fs from 'node:fs';
import path from 'node:path';

export interface Editorial {
  slug: string;
  title: string;
  author: string;
  date: string;
  abstract: string;
  tags: string[];
  draft: boolean;
  layout?: string;
  html: string;
}

const EDITORIALS_DIR = path.resolve('src/data/editorials');

/**
 * Load all editorials from the data directory.
 * Each editorial is a folder with meta.json + content.html.
 */
export function loadEditorials(): Editorial[] {
  if (!fs.existsSync(EDITORIALS_DIR)) {
    return [];
  }

  const dirs = fs.readdirSync(EDITORIALS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  const editorials: Editorial[] = [];

  for (const slug of dirs) {
    const metaPath = path.join(EDITORIALS_DIR, slug, 'meta.json');
    const htmlPath = path.join(EDITORIALS_DIR, slug, 'content.html');

    if (!fs.existsSync(metaPath) || !fs.existsSync(htmlPath)) {
      console.warn(`[editorial-loader] Skipping "${slug}": missing meta.json or content.html`);
      continue;
    }

    try {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      const html = fs.readFileSync(htmlPath, 'utf-8');

      if (meta.draft) continue;

      editorials.push({
        slug,
        title: meta.title || slug,
        author: meta.author || '',
        date: meta.date || '',
        abstract: meta.abstract || '',
        tags: meta.tags || [],
        draft: meta.draft || false,
        layout: meta.layout || 'ieee',
        html,
      });
    } catch (err) {
      console.error(`[editorial-loader] Error loading "${slug}":`, err);
    }
  }

  // Sort by date descending
  editorials.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return editorials;
}

/**
 * Load a single editorial by slug.
 */
export function loadEditorial(slug: string): Editorial | null {
  const metaPath = path.join(EDITORIALS_DIR, slug, 'meta.json');
  const htmlPath = path.join(EDITORIALS_DIR, slug, 'content.html');

  if (!fs.existsSync(metaPath) || !fs.existsSync(htmlPath)) {
    return null;
  }

  try {
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    const html = fs.readFileSync(htmlPath, 'utf-8');

    return {
      slug,
      title: meta.title || slug,
      author: meta.author || '',
      date: meta.date || '',
      abstract: meta.abstract || '',
      tags: meta.tags || [],
      draft: meta.draft || false,
      layout: meta.layout || 'ieee',
      html,
    };
  } catch {
    return null;
  }
}
