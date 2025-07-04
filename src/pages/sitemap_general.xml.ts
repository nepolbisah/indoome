// src/pages/sitemap_general.xml.ts
import type { APIRoute } from 'astro';
import { slugify } from '../utils/slugify';
import { getAllVideos, type VideoData } from '../utils/data';

export const GET: APIRoute = async ({ site }) => {
  if (!site) {
    return new Response('Site URL is not defined in Astro config.', { status: 500 });
  }

  const currentTime = new Date().toISOString();
  const defaultSitePublishedDate = import.meta.env.PUBLIC_SITE_PUBLISHED_DATE || currentTime;

  let allVideos: VideoData[] = [];
  try {
    allVideos = await getAllVideos();
    // Hitung dan tambahkan properti 'calculatedLastMod' ke setiap objek video
    // Ini penting agar lastMod yang sama digunakan di semua sitemap
    allVideos = allVideos.map(video => {
      const videoActualPublishedDate = video.datePublished || defaultSitePublishedDate;
      const calculatedLastMod = video.dateModified || video.datePublished || randomDateBetween(videoActualPublishedDate, currentTime);
      return { ...video, calculatedLastMod };
    });

  } catch (error) {
    console.error("Gagal memuat data video untuk sitemap_general:", error);
    return new Response('Failed to load video data for general sitemap.', { status: 500 });
  }
  
  const baseUrl = site.href.endsWith('/') ? site.href.slice(0, -1) : site.href;

  let urls: string[] = [];

  // 1. Tambahkan halaman statis utama
  // Homepage: Tetap menggunakan currentTime
  urls.push(`<url><loc>${baseUrl}/</loc><lastmod>${currentTime}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>`);
  
  // Halaman Kategori Indeks dan Tags Indeks: Tanggal acak yang berbeda
  urls.push(`<url><loc>${baseUrl}/category/</loc><lastmod>${randomDateBetween(defaultSitePublishedDate, currentTime)}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`);
  urls.push(`<url><loc>${baseUrl}/tags/</loc><lastmod>${randomDateBetween(defaultSitePublishedDate, currentTime)}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`);
  
  // 2. Tambahkan URL untuk setiap video (menggunakan calculatedLastMod yang sudah dihitung)
  allVideos.forEach(video => {
    if (!video.id || !video.title) {
        console.warn(`Melewatkan video untuk sitemap_general karena ID atau judul hilang: ${video.id || 'N/A'}`);
        return; 
    }
    const videoDetailUrl = `${baseUrl}/${slugify(video.title)}-${video.id}/`;
    urls.push(`<url><loc>${videoDetailUrl}</loc><lastmod>${video.calculatedLastMod}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`);
  });

  // 3. Tambahkan URL untuk setiap halaman kategori spesifik (tanggal acak yang berbeda)
  const categories = new Set(allVideos.map(video => video.category).filter(Boolean));
  categories.forEach(category => {
    const categorySlug = slugify(category);
    urls.push(`<url><loc>${baseUrl}/category/${categorySlug}/1</loc><lastmod>${randomDateBetween(defaultSitePublishedDate, currentTime)}</lastmod><changefreq>daily</changefreq><priority>0.9</priority></url>`);
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

// --- Helper function untuk menghasilkan tanggal acak ---
function randomDateBetween(start: string, end: string): string {
    const startDate = new Date(start);
    const endDate = new Date(end);

    const startMillis = startDate.getTime();
    const endMillis = endDate.getTime();

    if (startMillis > endMillis) {
        return end;
    }

    const randomMillis = startMillis + Math.random() * (endMillis - startMillis);
    
    return new Date(randomMillis).toISOString();
}
