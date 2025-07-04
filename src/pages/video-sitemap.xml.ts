// src/pages/video-sitemap.xml.ts
import type { APIRoute } from 'astro';
import { slugify } from '../utils/slugify';
import { getAllVideos, type VideoData } from '../utils/data';

// Perluas tipe VideoData untuk menyertakan properti baru untuk tanggal yang ditentukan
type VideoDataWithDeterminedDate = VideoData & { videoDeterminedDate?: string };

export const GET: APIRoute = async ({ site }) => {
  if (!site) {
    return new Response('Site URL is not defined in Astro config.', { status: 500 });
  }

  const currentTime = new Date().toISOString(); // Waktu saat ini untuk lastmod (kecuali video)
  const defaultSitePublishedDate = import.meta.env.PUBLIC_SITE_PUBLISHED_DATE || currentTime;

  let allVideos: VideoDataWithDeterminedDate[] = [];
  try {
    allVideos = await getAllVideos();
    // Hitung dan tambahkan properti 'videoDeterminedDate' ke setiap objek video
    // Penting: Logika ini harus sama persis dengan di sitemap_general.xml.ts
    allVideos = allVideos.map(video => {
      const determinedDate = video.datePublished || randomDateBetween(defaultSitePublishedDate, currentTime);
      return { ...video, videoDeterminedDate: determinedDate };
    });
  } catch (error) {
    console.error("Gagal memuat data video untuk video-sitemap:", error);
    return new Response('Gagal memuat data video untuk sitemap.', { status: 500 });
  }

  const baseUrl = site.href.endsWith('/') ? site.href.slice(0, -1) : site.href;

  let videoEntries: string[] = [];

  allVideos.forEach(video => {
    if (!video.id || !video.videoDeterminedDate) {
        console.warn(`Melewatkan video tanpa ID atau videoDeterminedDate untuk sitemap: ${video.title || 'Unknown Title'}`);
        return;
    }

    const videoDetailUrl = `${baseUrl}/${slugify(video.title)}-${video.id}/`;
    const thumbnailUrl = video.thumbnail;
    const embedUrl = video.embedUrl;

    const absoluteThumbnailUrl = thumbnailUrl && (thumbnailUrl.startsWith('http://') || thumbnailUrl.startsWith('https://')) ? thumbnailUrl : `${baseUrl}${thumbnailUrl}`;
    const absoluteEmbedUrl = embedUrl && (embedUrl.startsWith('http://') || embedUrl.startsWith('https://')) ? embedUrl : `${baseUrl}${embedUrl}`;

    const duration = video.duration && typeof video.duration === 'number' ? Math.round(video.duration) : 126;

    if (video.title && video.description && absoluteThumbnailUrl && absoluteEmbedUrl) {
      let tagsHtml = '';
      if (video.tags) {
        let tagsToProcess: string[] = [];
        if (Array.isArray(video.tags)) {
          tagsToProcess = video.tags;
        } else if (typeof video.tags === 'string') {
          tagsToProcess = video.tags.split(',').map(tag => tag.trim());
        }

        tagsHtml = tagsToProcess
          .filter(tag => tag.length > 0)
          .map(tag => `<video:tag>${escapeXml(tag)}</video:tag>`)
          .join('\n            ');
      }

      videoEntries.push(`
        <url>
          <loc>${videoDetailUrl}</loc>
          <lastmod>${video.videoDeterminedDate}</lastmod> <changefreq>weekly</changefreq>
          <priority>0.8</priority>
          <video:video>
            <video:thumbnail_loc>${absoluteThumbnailUrl}</video:thumbnail_loc>
            <video:title>${escapeXml(video.title)}</video:title>
            <video:description>${escapeXml(video.description)}</video:description>
            <video:content_loc>${absoluteEmbedUrl}</video:content_loc>
            <video:duration>${duration}</video:duration>
            <video:publication_date>${video.videoDeterminedDate}</video:publication_date> ${tagsHtml}
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
