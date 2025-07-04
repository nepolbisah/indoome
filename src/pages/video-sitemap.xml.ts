// src/pages/video-sitemap.xml.ts
import type { APIRoute } from 'astro';
import { slugify } from '../utils/slugify';
import { getAllVideos, type VideoData } from '../utils/data';

export const GET: APIRoute = async ({ site }) => {
  if (!site) {
    return new Response('Site URL is not defined in Astro config.', { status: 500 });
  }

  // --- Ambil PUBLIC_SITE_PUBLISHED_DATE dari environment ---
  const defaultPublishedDate = import.meta.env.PUBLIC_SITE_PUBLISHED_DATE || new Date().toISOString();

  let allVideos: VideoData[] = [];
  try {
    allVideos = await getAllVideos();
  } catch (error) {
    console.error("Gagal memuat data video untuk video-sitemap:", error);
    return new Response('Gagal memuat data video untuk sitemap.', { status: 500 });
  }

  const baseUrl = site.href.endsWith('/') ? site.href.slice(0, -1) : site.href;

  let videoEntries: string[] = [];

  allVideos.forEach(video => {
    if (!video.id) {
        console.warn(`Melewatkan video tanpa ID untuk sitemap: ${video.title || 'Unknown Title'}`);
        return;
    }

    const videoDetailUrl = `${baseUrl}/${slugify(video.title)}-${video.id}/`;
    const thumbnailUrl = video.thumbnail;
    const embedUrl = video.embedUrl;

    const absoluteThumbnailUrl = thumbnailUrl && (thumbnailUrl.startsWith('http://') || thumbnailUrl.startsWith('https://')) ? thumbnailUrl : `${baseUrl}${thumbnailUrl}`;
    const absoluteEmbedUrl = embedUrl && (embedUrl.startsWith('http://') || embedUrl.startsWith('https://')) ? embedUrl : `${baseUrl}${embedUrl}`;

    const duration = video.duration && typeof video.duration === 'number' ? Math.round(video.duration) : 126;
    // --- Gunakan defaultPublishedDate sebagai fallback untuk video.datePublished ---
    const videoPublishedDate = video.datePublished || defaultPublishedDate;
    const videoModifiedDate = video.dateModified || new Date().toISOString();

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
          <lastmod>${new Date().toISOString()}</lastmod>
          <changefreq>weekly</changefreq>
          <priority>0.8</priority>
          <video:video>
            <video:thumbnail_loc>${absoluteThumbnailUrl}</video:thumbnail_loc>
            <video:title>${escapeXml(video.title)}</video:title>
            <video:description>${escapeXml(video.description)}</video:description>
            <video:content_loc>${absoluteEmbedUrl}</video:content_loc>
            <video:duration>${duration}</video:duration>
            <video:publication_date>${videoPublishedDate}</video:publication_date>
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
