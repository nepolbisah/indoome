// src/pages/sitemap_general.xml.ts
import type { APIRoute } from 'astro';
import { slugify } from '../utils/slugify';
import { getAllVideos, type VideoData } from '../utils/data';

export const GET: APIRoute = async ({ site }) => {
  if (!site) {
    return new Response('Site URL is not defined in Astro config.', { status: 500 });
  }

  const currentTime = new Date().toISOString(); // Waktu saat ini, digunakan untuk semua lastmod

  let allVideos: VideoData[] = [];
  try {
    allVideos = await getAllVideos();
  } catch (error) {
    console.error("Failed to load video data for sitemap_general:", error);
    return new Response('Failed to load video data for general sitemap.', { status: 500 });
  }
  
  const baseUrl = site.href.endsWith('/') ? site.href.slice(0, -1) : site.href;

  let urls: string[] = [];

  // 1. Add main static pages
  // Homepage: lastmod uses currentTime
  urls.push(`<url><loc>${baseUrl}/</loc><lastmod>${currentTime}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>`);
  
  // Category Index and Tags Index pages: lastmod uses currentTime
  urls.push(`<url><loc>${baseUrl}/category/</loc><lastmod>${currentTime}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`);
  urls.push(`<url><loc>${baseUrl}/tags/</loc><lastmod>${currentTime}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`);
  
  // 2. Add URLs for each video detail page
  allVideos.forEach(video => {
    if (!video.id || !video.title) {
        console.warn(`Skipping video for sitemap_general due to missing ID or title: ${video.id || 'N/A'}`);
        return; 
    }
    const videoDetailUrl = `${baseUrl}/${slugify(video.title)}-${video.id}/`;
    // lastmod for video detail pages uses currentTime
    urls.push(`<url><loc>${videoDetailUrl}</loc><lastmod>${currentTime}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`);
  });

  // 3. Add URLs for each specific category page
  const categories = new Set(allVideos.map(video => video.category).filter(Boolean));
  categories.forEach(category => {
    const categorySlug = slugify(category);
    // lastmod for specific category pages uses currentTime
    urls.push(`<url><loc>${baseUrl}/category/${categorySlug}/1</loc><lastmod>${currentTime}</lastmod><changefreq>daily</changefreq><priority>0.9</priority></url>`);
  });

  const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls.join('\n  ')}
</urlset>`;

  return new Response(sitemapContent, {
    headers: {
      'Content-Type': 'application/xml',
    },
  });
};

// --- Remove randomDateBetween function ---
