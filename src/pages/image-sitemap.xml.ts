// src/pages/image-sitemap.xml.ts
import type { APIRoute } from 'astro';
import { slugify } from '../utils/slugify';
import { getAllVideos, type VideoData } from '../utils/data'; // Pastikan ini mengimpor fungsi yang benar

export const GET: APIRoute = async ({ site }) => {
  if (!site) {
    // Memberikan respons error jika URL situs tidak terdefinisi
    return new Response('Site URL is not defined in Astro config.', { status: 500 });
  }

  let allVideos: VideoData[] = [];
  try {
    // Memuat semua data video; tambahkan penanganan error jika gagal
    allVideos = await getAllVideos();
  } catch (error) {
    console.error("Gagal memuat data video untuk image-sitemap:", error);
    return new Response('Gagal memuat data video untuk sitemap gambar.', { status: 500 });
  }

  const baseUrl = site.href.endsWith('/') ? site.href.slice(0, -1) : site.href;
  const currentTimestamp = new Date().toISOString(); // Digunakan untuk lastmod jika tidak ada tanggal publikasi

  let imageEntries: string[] = [];

  // --- Tambahkan logo situs Anda (dengan escaping dan URL absolut) ---
  const logoUrl = `${baseUrl}/logo.png`; // Pastikan path logo sudah benar di folder public/
  imageEntries.push(`
    <url>
      <loc>${baseUrl}/</loc>
      <lastmod>${currentTimestamp}</lastmod> <image:image>
        <image:loc>${logoUrl}</image:loc>
        <image:caption>${escapeXml(`Logo ${site.hostname}`)}</image:caption>
        <image:title>${escapeXml(`Logo ${site.hostname}`)}</image:title>
      </image:image>
    </url>
  `);

  // --- Loop melalui semua video untuk menambahkan thumbnail mereka ---
  allVideos.forEach(video => {
    // Pastikan video memiliki ID dan judul yang valid untuk URL
    if (!video.id || !video.title) {
        console.warn(`Melewatkan video untuk sitemap gambar karena ID atau judul hilang: ${video.id || 'N/A'}`);
        return; // Lewati video ini jika data utamanya tidak lengkap
    }

    const videoDetailUrl = `${baseUrl}/video/${video.id}/${slugify(video.title)}`; // URL halaman video
    const thumbnailUrl = video.thumbnail; // URL gambar thumbnail video

    // Validasi dan pastikan thumbnailUrl adalah URL absolut
    const absoluteThumbnailUrl = thumbnailUrl && (thumbnailUrl.startsWith('http://') || thumbnailUrl.startsWith('https://'))
        ? thumbnailUrl
        : `${baseUrl}${thumbnailUrl}`;

    // Pastikan kita memiliki thumbnail dan URL halaman video yang valid
    if (absoluteThumbnailUrl && videoDetailUrl) {
      // Dapatkan lastmod dari video, jika ada, atau gunakan timestamp saat ini
      const videoLastMod = video.dateModified || video.datePublished || currentTimestamp;

      imageEntries.push(`
        <url>
          <loc>${videoDetailUrl}</loc>
          <lastmod>${videoLastMod}</lastmod>
          <image:image>
            <image:loc>${absoluteThumbnailUrl}</image:loc>
            <image:caption>${escapeXml(video.description || video.title)}</image:caption> <image:title>${escapeXml(video.title)}</image:title>
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

// --- Helper function untuk melarikan (escape) entitas XML ---
function escapeXml(unsafe: string | null | undefined): string {
  if (!unsafe) return ''; // Tangani nilai null/undefined/kosong
  return unsafe.replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&apos;';
      case '"': return '&quot;';
      default: return c; // Seharusnya tidak terjadi
    }
  });
}
