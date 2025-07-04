// src/pages/image-sitemap.xml.ts
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
    console.error("Failed to load video data for image-sitemap:", error);
    return new Response('Failed to load video data for image sitemap.', { status: 500 });
  }

  const baseUrl = site.href.endsWith('/') ? site.href.slice(0, -1) : site.href;

  let imageEntries: string[] = [];

  // --- Add site logo (lastmod uses currentTime) ---
  imageEntries.push(`
    <url>
      <loc>${baseUrl}/</loc>
      <lastmod>${currentTime}</lastmod> 
      <image:image>
        <image:loc>${baseUrl}/logo.png</image:loc>
        <image:caption>${escapeXml(`Logo ${site.hostname}`)}</image:caption>
        <image:title>${escapeXml(`Logo ${site.hostname}`)}</image:title>
      </image:image>
    </url>
  `);

  allVideos.forEach(video => {
    if (!video.id || !video.title) {
        console.warn(`Skipping video for image sitemap due to missing ID or title: ${video.id || 'N/A'}`);
        return;
    }

    const videoDetailUrl = `${baseUrl}/${slugify(video.title)}-${video.id}/`;
    const thumbnailUrl = video.thumbnail;

    const absoluteThumbnailUrl = thumbnailUrl && (thumbnailUrl.startsWith('http://') || thumbnailUrl.startsWith('https://'))
        ? thumbnailUrl
        : `${baseUrl}${thumbnailUrl}`;

    if (absoluteThumbnailUrl && videoDetailUrl) {
      // lastmod for video image entries uses currentTime
      imageEntries.push(`
        <url>
          <loc>${videoDetailUrl}</loc>
          <lastmod>${currentTime}</lastmod> 
          <image:image>
            <image:loc>${absoluteThumbnailUrl}</image:loc>
            <image:caption>${escapeXml(video.description || video.title)}</image:caption>
            <image:title>${escapeXml(video.title)}</image:title>
          </image:image>
        </url>
      `);
    } else {
        console.warn(`Skipping video thumbnail for image sitemap due to invalid or missing URL: ID ${video.id}`);
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

// --- Remove randomDateBetween function ---

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
