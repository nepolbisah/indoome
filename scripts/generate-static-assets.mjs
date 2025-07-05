// scripts/generate-static-assets.mjs
import 'dotenv/config'; // Pastikan dotenv dimuat untuk process.env.PUBLIC_SITE_URL
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getAllVideos } from '../src/utils/data.js'; // Pastikan path ini benar dan ada '.js'
import { slugify } from '../src/utils/slugify.js'; // Pastikan path ini benar dan ada '.js'

// Helper untuk mendapatkan path absolut
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '../../');
const publicDir = path.join(projectRoot, 'public');

// Helper function untuk melarikan (escape) entitas XML
function escapeXml(unsafe) {
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

async function generateStaticAssets() {
    console.log('[Static Asset Generator] Starting generation of sitemaps and robots.txt...');

    // Pastikan PUBLIC_SITE_URL didefinisikan di .env
    const baseUrl = process.env.PUBLIC_SITE_URL;
    if (!baseUrl) {
        console.error("[Static Asset Generator] Error: PUBLIC_SITE_URL is not defined in environment variables. Please set it in your .env file.");
        process.exit(1);
    }
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    
    // Waktu build saat ini, akan digunakan sebagai fallback dan untuk halaman statis
    const currentBuildTime = new Date().toISOString(); 

    // --- Generate robots.txt ---
    const robotsContent = `# https://www.robotstxt.org/robotstxt.html
User-agent: *
Allow: /

# Sitemaps
Sitemap: ${cleanBaseUrl}/sitemap.xml
Sitemap: ${cleanBaseUrl}/sitemap_general.xml
Sitemap: ${cleanBaseUrl}/image_sitemap.xml
Sitemap: ${cleanBaseUrl}/video_sitemap.xml

# Host (optional, but good for Bing)
Host: ${new URL(cleanBaseUrl).hostname}

Crawl-delay: 10 # Example, adjust as needed

# Block common sensitive paths (adjust as needed for your project)
Disallow: /admin/
Disallow: /private/
Disallow: /temp/
Disallow: /dashboard/
Disallow: /login/
Disallow: /register/
Disallow: /search
`;
    await fs.writeFile(path.join(publicDir, 'robots.txt'), robotsContent, 'utf-8');
    console.log('[Static Asset Generator] robots.txt generated.');

    // --- Ambil Data Video ---
    let allVideos = [];
    try {
        allVideos = await getAllVideos();
        console.log(`[Static Asset Generator] Loaded ${allVideos.length} videos for sitemaps.`);
    } catch (error) {
        console.error("[Static Asset Generator] Failed to load video data for sitemaps:", error);
        // Lanjutkan saja jika data video gagal dimuat, sitemaps mungkin kosong atau kurang lengkap
    }

    // --- Generate sitemap.xml (Index Sitemap) ---
    const sitemapIndexContent = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${cleanBaseUrl}/sitemap_general.xml</loc>
    <lastmod>${currentBuildTime}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${cleanBaseUrl}/video_sitemap.xml</loc>
    <lastmod>${currentBuildTime}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${cleanBaseUrl}/image_sitemap.xml</loc>
    <lastmod>${currentBuildTime}</lastmod>
  </sitemap>
</sitemapindex>`;
    await fs.writeFile(path.join(publicDir, 'sitemap.xml'), sitemapIndexContent, 'utf-8');
    console.log('[Static Asset Generator] sitemap.xml generated.');

    // --- Generate sitemap_general.xml ---
    let generalUrls = [];
    // Static pages
    generalUrls.push(`<url>
      <loc>${cleanBaseUrl}/</loc>
      <lastmod>${currentBuildTime}</lastmod>
      <changefreq>daily</changefreq>
      <priority>1.0</priority>
    </url>`);
    generalUrls.push(`<url>
      <loc>${cleanBaseUrl}/category/</loc>
      <lastmod>${currentBuildTime}</lastmod>
      <changefreq>weekly</changefreq>
      <priority>0.8</priority>
    </url>`);
    generalUrls.push(`<url>
      <loc>${cleanBaseUrl}/tags/</loc>
      <lastmod>${currentBuildTime}</lastmod>
      <changefreq>weekly</changefreq>
      <priority>0.8</priority>
    </url>`);
    // Video detail pages
    allVideos.forEach(video => {
        if (!video.id || !video.title) {
            console.warn(`[Sitemap General] Skipping video due to missing ID or title: ${video.id || 'N/A'}`);
            return;
        }
        const videoDetailUrl = `${cleanBaseUrl}/${slugify(video.title)}-${video.id}/`;
        const videoPageLastMod = video.dateModified || currentBuildTime; 
        generalUrls.push(`<url>
          <loc>${videoDetailUrl}</loc>
          <lastmod>${videoPageLastMod}</lastmod>
          <changefreq>weekly</changefreq>
          <priority>0.7</priority>
        </url>`);
    });
    // Specific category pages (assuming page 1)
    const categories = new Set(allVideos.map(video => video.category).filter(Boolean));
    categories.forEach(category => {
        const categorySlug = slugify(category);
        generalUrls.push(`<url>
          <loc>${cleanBaseUrl}/category/${categorySlug}/1</loc>
          <lastmod>${currentBuildTime}</lastmod>
          <changefreq>daily</changefreq>
          <priority>0.9</priority>
        </url>`);
    });
    const sitemapGeneralContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${generalUrls.join('\n  ')}
</urlset>`;
    await fs.writeFile(path.join(publicDir, 'sitemap_general.xml'), sitemapGeneralContent, 'utf-8');
    console.log('[Static Asset Generator] sitemap_general.xml generated.');

    // --- Generate image_sitemap.xml ---
    let imageEntries = [];
    const logoUrl = `${cleanBaseUrl}/logo.png`;
    imageEntries.push(`
      <url>
        <loc>${cleanBaseUrl}/</loc>
        <lastmod>${currentBuildTime}</lastmod>
        <image:image>
          <image:loc>${logoUrl}</image:loc>
          <image:caption>${escapeXml(`Logo ${new URL(cleanBaseUrl).hostname}`)}</image:caption>
          <image:title>${escapeXml(`Logo ${new URL(cleanBaseUrl).hostname}`)}</image:title>
        </image:image>
      </url>
    `);
    allVideos.forEach(video => {
        if (!video.id || !video.title) {
            console.warn(`[Image Sitemap] Skipping video due to missing ID or title: ${video.id || 'N/A'}`);
            return;
        }
        const videoDetailUrl = `${cleanBaseUrl}/${slugify(video.title)}-${video.id}/`;
        const thumbnailUrl = video.thumbnail;
        const absoluteThumbnailUrl = thumbnailUrl && (thumbnailUrl.startsWith('http://') || thumbnailUrl.startsWith('https://'))
            ? thumbnailUrl
            : `${cleanBaseUrl}${thumbnailUrl}`;
        const videoLastMod = video.dateModified || currentBuildTime; 
        if (absoluteThumbnailUrl && videoDetailUrl) {
            imageEntries.push(`
              <url>
                <loc>${videoDetailUrl}</loc>
                <lastmod>${videoLastMod}</lastmod>
                <image:image>
                  <image:loc>${absoluteThumbnailUrl}</image:loc>
                  <image:caption>${escapeXml(video.description || video.title)}</image:caption>
                  <image:title>${escapeXml(video.title)}</image:title>
                </image:image>
              </url>
            `);
        } else {
            console.warn(`[Image Sitemap] Skipping thumbnail for video due to invalid or missing URL: ID ${video.id}`);
        }
    });
    const sitemapImageContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  ${imageEntries.join('\n  ')}
</urlset>`;
    await fs.writeFile(path.join(publicDir, 'image_sitemap.xml'), sitemapImageContent, 'utf-8');
    console.log('[Static Asset Generator] image_sitemap.xml generated.');

    // --- Generate video_sitemap.xml ---
    let videoEntries = [];
    allVideos.forEach(video => {
        if (!video.id || !video.title || !video.embedUrl || !video.thumbnail) {
            console.warn(`[Video Sitemap] Skipping video due to missing crucial data: ID ${video.id || 'N/A'}`);
            return;
        }
        const videoDetailUrl = `${cleanBaseUrl}/${slugify(video.title)}-${video.id}/`;
        const absoluteThumbnailUrl = video.thumbnail.startsWith('http') ? video.thumbnail : `${cleanBaseUrl}${video.thumbnail}`;
        const publicationDate = video.datePublished || currentBuildTime;
        const lastModDate = video.dateModified || currentBuildTime;
        videoEntries.push(`
          <url>
            <loc>${videoDetailUrl}</loc>
            <lastmod>${lastModDate}</lastmod>
            <video:video>
              <video:thumbnail_loc>${absoluteThumbnailUrl}</video:thumbnail_loc>
              <video:title>${escapeXml(video.title)}</video:title>
              <video:description>${escapeXml(video.description || video.title)}</video:description>
              <video:content_loc>${video.embedUrl}</video:content_loc>
              <video:player_loc>${video.embedUrl}</video:player_loc>
              <video:duration>${video.duration || 0}</video:duration>
              <video:publication_date>${publicationDate}</video:publication_date>
              <video:tag>${escapeXml(Array.isArray(video.tags) ? video.tags.join(', ') : video.tags || '')}</video:tag>
            </video:video>
          </url>
        `);
    });
    const sitemapVideoContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
  ${videoEntries.join('\n  ')}
</urlset>`;
    await fs.writeFile(path.join(publicDir, 'video_sitemap.xml'), sitemapVideoContent, 'utf-8');
    console.log('[Static Asset Generator] video_sitemap.xml generated.');

    console.log('[Static Asset Generator] All static assets (sitemaps and robots.txt) generated successfully!');
}

generateStaticAssets().catch(console.error);
