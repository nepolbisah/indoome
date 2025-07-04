// src/pages/image-sitemap.xml.ts
import type { APIRoute } from 'astro';
import { slugify } from '../utils/slugify';
import { getAllVideos, type VideoData } from '../utils/data';

// Perluas tipe VideoData untuk menyertakan properti baru
type VideoDataWithCalculatedLastMod = VideoData & { calculatedLastMod?: string };

export const GET: APIRoute = async ({ site }) => {
  if (!site) {
    return new Response('Site URL is not defined in Astro config.', { status: 500 });
  }

  const currentTime = new Date().toISOString();
  const defaultSitePublishedDate = import.meta.env.PUBLIC_SITE_PUBLISHED_DATE || currentTime;

  let allVideos: VideoDataWithCalculatedLastMod[] = [];
  try {
    allVideos = await getAllVideos();
    // Hitung dan tambahkan properti 'calculatedLastMod' ke setiap objek video
    // Penting: Logika ini harus sama persis dengan di sitemap_general.xml.ts
    allVideos = allVideos.map(video => {
      const videoActualPublishedDate = video.datePublished || defaultSitePublishedDate;
      const calculatedLastMod = video.dateModified || video.datePublished || randomDateBetween(videoActualPublishedDate, currentTime);
      return { ...video, calculatedLastMod };
    });
  } catch (error) {
    console.error("Gagal memuat data video untuk image-sitemap:", error);
    return new Response('Gagal memuat data video untuk sitemap gambar.', { status: 500 });
  }

  const baseUrl = site.href.endsWith('/') ? site.href.slice(0, -1) : site.href;

  let imageEntries: string[] = [];

  // --- Tambahkan logo situs Anda (lastmod menggunakan defaultSitePublishedDate) ---
  const logoUrl = `${baseUrl}/logo.png`;
  imageEntries.push(`
    <url>
      <loc>${baseUrl}/</loc>
      <lastmod>${defaultSitePublishedDate}</lastmod> <image:image>
        <image:loc>${logoUrl}</image:loc>
        <image:caption>${escapeXml(`Logo ${site.hostname}`)}</image:caption>
        <image:title>${escapeXml(`Logo ${site.hostname}`)}</image:title>
      </image:image>
    </url>
  `);

  allVideos.forEach(video => {
    if (!video.id || !video.title || !video.calculatedLastMod) { // Pastikan calculatedLastMod ada
        console.warn(`Melewatkan video untuk sitemap gambar karena ID, judul, atau calculatedLastMod hilang: ${video.id || 'N/A'}`);
        return;
    }

    const videoDetailUrl = `${baseUrl}/${slugify(video.title)}-${video.id}/`;
    const thumbnailUrl = video.thumbnail;

    const absoluteThumbnailUrl = thumbnailUrl && (thumbnailUrl.startsWith('http://') || thumbnailUrl.startsWith('https://'))
        ? thumbnailUrl
        : `${baseUrl}${thumbnailUrl}`;

    if (absoluteThumbnailUrl && videoDetailUrl) {
      imageEntries.push(`
        <url>
          <loc>${videoDetailUrl}</loc>
          <lastmod>${video.calculatedLastMod}</lastmod> <image:image>
            <image:loc>${absoluteThumbnailUrl}</image:loc>
            <image:caption>${escapeXml(video.description || video.title)}</image:caption>
            <image:title>${escapeXml(video.title)}</image:title>
          </image:image>
        </url>
      `);
    } else {
        console.warn(`Melewatkan thumbnail video untuk sitemap gambar karena URL tidak valid atau hilang: ID ${video.id}`);
    }
  });

  const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  ${imageEntries.join('\n  ')}
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
    if (startMillis > endMillis) { return end; }
    const randomMillis = startMillis + Math.random() * (endMillis - startMillis);
    return new Date(randomMillis).toISOString();
}

function escapeXml(unsafe: string | null | undefined): string {
  if (!unsafe) return '';
  return unsafe.replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}
