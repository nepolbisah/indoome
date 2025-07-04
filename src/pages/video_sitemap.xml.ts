// src/pages/video-sitemap.xml.ts
import type { APIRoute } from 'astro';
import { slugify } from '../utils/slugify';
import { getAllVideos, type VideoData } from '../utils/data'; // Pastikan getAllVideos terimport

export const GET: APIRoute = async ({ site }) => {
  if (!site) {
    // Memberikan respons error jika site URL tidak didefinisikan
    return new Response('Site URL is not defined in Astro config.', { status: 500 });
  }

  let allVideos: VideoData[] = [];
  try {
    // Mengambil data video yang sudah diproses dan di-cache dari src/utils/data.ts
    allVideos = await getAllVideos();
  } catch (error) {
    console.error("Failed to load video data for video-sitemap:", error);
    return new Response('Failed to load video data for sitemap.', { status: 500 });
  }

  // Memastikan base URL berakhir tanpa slash untuk pembentukan URL yang konsisten
  const baseUrl = site.href.endsWith('/') ? site.href.slice(0, -1) : site.href;

  let videoEntries: string[] = [];

  allVideos.forEach(video => {
    // Melakukan validasi dasar pada data video
    if (!video.id || !video.title || !video.description || !video.thumbnail || !video.embedUrl) {
        console.warn(`Skipping video for video-sitemap due to missing required data: ID ${video.id || 'N/A'}`);
        return;
    }

    // Membangun URL detail video
    const videoDetailUrl = `${baseUrl}/${slugify(video.title)}-${video.id}/`;
    
    // Memastikan URL thumbnail dan embed absolut
    const absoluteThumbnailUrl = video.thumbnail.startsWith('http://') || video.thumbnail.startsWith('https://')
        ? video.thumbnail
        : `${baseUrl}${video.thumbnail}`;
    
    const absoluteEmbedUrl = video.embedUrl.startsWith('http://') || video.embedUrl.startsWith('https://')
        ? video.embedUrl
        : `${baseUrl}${video.embedUrl}`;

    // Menentukan durasi video, fallback ke 126 detik jika tidak ada
    const duration = video.duration && typeof video.duration === 'number' ? Math.round(video.duration) : 126;
    
    // Menggunakan datePublished dan dateModified yang sudah diproses dari getAllVideos()
    // Ini memastikan konsistensi dengan Schema.org markup dan sitemap gambar
    const videoPublishedDate = video.datePublished; 
    const videoModifiedDate = video.dateModified; 

    // Membangun string tag XML jika ada tag yang tersedia
    let tagsHtml = '';
    if (video.tags) {
      let tagsToProcess: string[] = [];
      if (Array.isArray(video.tags)) {
        tagsToProcess = video.tags;
      } else if (typeof video.tags === 'string') {
        tagsToProcess = video.tags.split(',').map(tag => tag.trim());
      }

      tagsHtml = tagsToProcess
        .filter(tag => tag.length > 0) // Pastikan tag tidak kosong
        .map(tag => `<video:tag>${escapeXml(tag)}</video:tag>`) // Escape setiap tag
        .join('\n            '); // Gabungkan dengan indentasi yang tepat
    }

    // Menambahkan entri video ke array
    videoEntries.push(`
        <url>
          <loc>${videoDetailUrl}</loc>
          <lastmod>${videoModifiedDate}</lastmod>
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
  });

  // Membangun string sitemap XML lengkap
  const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
  ${videoEntries.join('\n  ')}
</urlset>`; // Gabungkan entri video dengan indentasi yang benar

  // Mengembalikan respons XML
  return new Response(sitemapContent, {
    headers: {
      'Content-Type': 'application/xml',
    },
  });
};

// Fungsi helper untuk melarikan (escape) entitas XML
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
