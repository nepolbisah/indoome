// src/pages/sitemap.xml.ts
import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ site }) => {
  // Pastikan URL situs telah didefinisikan di astro.config.mjs
  if (!site) {
    return new Response('Site URL is not defined in Astro config.', { status: 500 });
  }

  // Bersihkan base URL dari trailing slash untuk konsistensi
  const baseUrl = site.href.endsWith('/') ? site.href.slice(0, -1) : site.href;
  
  // Mengambil stempel waktu saat ini untuk digunakan sebagai <lastmod>
  // Ini menunjukkan kapan indeks sitemap ini terakhir diperbarui
  const currentTimestamp = new Date().toISOString(); 

  // Membangun konten XML untuk sitemap indeks
  const sitemapIndexContent = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${baseUrl}/sitemap_general.xml</loc>
    <lastmod>${currentTimestamp}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${baseUrl}/video-sitemap.xml</loc>
    <lastmod>${currentTimestamp}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${baseUrl}/image-sitemap.xml</loc>
    <lastmod>${currentTimestamp}</lastmod>
  </sitemap>
</sitemapindex>`;

  // Mengembalikan respons XML
  return new Response(sitemapIndexContent, {
    headers: {
      'Content-Type': 'application/xml',
    },
  });
};
