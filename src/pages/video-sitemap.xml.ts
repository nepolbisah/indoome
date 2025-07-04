// src/pages/video-sitemap.xml.ts
import type { APIRoute } from 'astro';
import { slugify } from '../utils/slugify';
import { getAllVideos, type VideoData } from '../utils/data'; // Pastikan ini mengimpor fungsi yang benar

export const GET: APIRoute = async ({ site }) => {
  if (!site) {
    return new Response('Site URL is not defined in Astro config.', { status: 500 });
  }

  let allVideos: VideoData[] = [];
  try {
    allVideos = await getAllVideos(); // Pastikan getAllVideos dapat menangani potensi error
  } catch (error) {
    console.error("Gagal memuat data video untuk video-sitemap:", error);
    return new Response('Gagal memuat data video untuk sitemap.', { status: 500 });
  }

  const baseUrl = site.href.endsWith('/') ? site.href.slice(0, -1) : site.href;

  let videoEntries: string[] = [];

  allVideos.forEach(video => {
    // Pastikan video.id tidak undefined/null agar URLnya valid
    if (!video.id) {
        console.warn(`Melewatkan video tanpa ID untuk sitemap: ${video.title || 'Unknown Title'}`);
        return; // Lewati video ini jika tidak memiliki ID yang valid
    }

    // Buat URL dan pastikan mereka absolut
    const videoDetailUrl = `${baseUrl}/video/${video.id}/${slugify(video.title)}`;
    const thumbnailUrl = video.thumbnail;
    const embedUrl = video.embedUrl;

    // Pastikan URL thumbnail dan embed absolut
    const absoluteThumbnailUrl = thumbnailUrl && (thumbnailUrl.startsWith('http://') || thumbnailUrl.startsWith('https://')) ? thumbnailUrl : `${baseUrl}${thumbnailUrl}`;
    const absoluteEmbedUrl = embedUrl && (embedUrl.startsWith('http://') || embedUrl.startsWith('https://')) ? embedUrl : `${baseUrl}${embedUrl}`;

    // Berikan nilai default dan pastikan tipe sudah benar
    // Durasi harus bilangan bulat (integer)
    const duration = video.duration && typeof video.duration === 'number' ? Math.round(video.duration) : 126;
    const datePublished = video.datePublished || new Date().toISOString();
    const dateModified = video.dateModified || datePublished;

    // Pastikan semua properti WAJIB ada dan valid sebelum ditambahkan ke sitemap
    if (video.title && video.description && absoluteThumbnailUrl && absoluteEmbedUrl) {
      // Tangani tag: asumsikan video.tags bisa berupa string atau array
      let tagsHtml = '';
      if (video.tags) {
        let tagsToProcess: string[] = [];
        if (Array.isArray(video.tags)) {
          tagsToProcess = video.tags;
        } else if (typeof video.tags === 'string') {
          tagsToProcess = video.tags.split(',').map(tag => tag.trim());
        }

        tagsHtml = tagsToProcess
          .filter(tag => tag.length > 0) // Filter out empty tags
          .map(tag => `<video:tag>${escapeXml(tag)}</video:tag>`)
          .join('\n            '); // Gabungkan dengan newline untuk keterbacaan XML
      }

      videoEntries.push(`
        <url>
          <loc>${absoluteThumbnailUrl}</loc>
          <lastmod>${dateModified}</lastmod>
          <changefreq>weekly</changefreq>
          <priority>0.8</priority>
          <video:video>
            <video:thumbnail_loc>${absoluteThumbnailUrl}</video:thumbnail_loc>
            <video:title>${escapeXml(video.title)}</video:title>
            <video:description>${escapeXml(video.description)}</video:description>
            <video:content_loc>${absoluteEmbedUrl}</video:content_loc>
            <video:duration>${duration}</video:duration>
            <video:publication_date>${datePublished}</video:publication_date>
            ${tagsHtml}
            ${video.category ? `<video:category>${escapeXml(video.category)}</video:category>` : ''}
          </video:video>
        </url>
      `);
    } else {
      console.warn(`Melewatkan video untuk sitemap karena data wajib hilang: ID ${video.id || 'N/A'}`);
    }
  });

  const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
  ${videoEntries.join('\n  ')}
</urlset>`;

  return new Response(sitemapContent, {
    headers: {
      'Content-Type': 'application/xml',
    },
  });
};

// Helper function untuk melarikan (escape) entitas XML
function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe.replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&apos;'; // Untuk single quote (apostrophe)
      case '"': return '&quot;'; // Untuk double quote
      default: return c; // Seharusnya tidak terjadi, tapi untuk fallback
    }
  });
}
