// src/utils/data.ts

import rawAllVideos from '../data/allVideos';

export interface VideoData {
  id: string;
  title: string;
  description: string;
  category: string;
  thumbnail: string;
  thumbnailWidth: number;
  thumbnailHeight: number;
  datePublished?: string; // Tanggal publikasi (bisa acak jika kosong)
  dateModified?: string;  // Tanggal modifikasi (konsisten dengan waktu build)
  embedUrl: string;
  tags: string | string[];
  previewUrl?: string;
  duration?: number;
}

// Fungsi helper untuk menghasilkan tanggal acak antara dua tanggal ISO string
// Batas awal akan diambil dari PUBLIC_SITE_PUBLISHED_DATE atau default
function randomDateBetween(start: string, end: string): string {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const startMillis = startDate.getTime();
    const endMillis = endDate.getTime();
    if (startMillis > endMillis) {
      return endDate.toISOString();
    }
    const randomMillis = startMillis + Math.random() * (endMillis - startMillis);
    return new Date(randomMillis).toISOString();
}

// Fungsi untuk menghasilkan tag dari title (tetap seperti sebelumnya)
function generateTagsFromTitle(title: string, currentTags: string | string[] | undefined, numberOfTags = 3): string[] {
    let existingTags: string[] = [];
    if (currentTags) {
        if (Array.isArray(currentTags)) {
            existingTags = currentTags;
        } else if (typeof currentTags === 'string') {
            existingTags = currentTags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
        }
    }

    if (existingTags.length > 0) {
        return existingTags;
    }

    const commonWords = new Set([
        'dan', 'di', 'yang', 'ini', 'itu', 'dengan', 'dari', 'untuk', 'pada', 'atau',
        'adalah', 'sebagai', 'tidak', 'saya', 'kami', 'mereka', 'video', 'film', 'movie',
        'jepang', 'indo', 'bokep'
    ]);

    const cleanedWords = title
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 2 && !commonWords.has(word));

    const uniqueWords = Array.from(new Set(cleanedWords));

    const shuffledWords = uniqueWords.sort(() => 0.5 - Math.random());

    return shuffledWords.slice(0, Math.min(numberOfTags, shuffledWords.length));
}

let cachedProcessedVideos: VideoData[] | null = null;
let buildProcessStartTime: string | null = null;

export async function getAllVideos(): Promise<VideoData[]> {
  if (cachedProcessedVideos) {
    return cachedProcessedVideos;
  }

  // Waktu ini akan menjadi dasar konsistensi untuk dateModified dan batas atas random datePublished
  buildProcessStartTime = new Date().toISOString();
  
  // Batas bawah untuk random datePublished, diambil dari .env atau buildProcessStartTime
  // Ini akan menjadi konsisten per build
  const datePublishedRandomRangeStart = import.meta.env.PUBLIC_SITE_PUBLISHED_DATE || buildProcessStartTime;

  const processedVideos: VideoData[] = (rawAllVideos as VideoData[]).map(video => {
    let finalDatePublished = video.datePublished;
    let finalDateModified = video.dateModified;

    // Logika datePublished:
    // Jika tidak ada di data mentah, HANYA di sini generate secara acak
    if (!finalDatePublished) {
      finalDatePublished = randomDateBetween(datePublishedRandomRangeStart, buildProcessStartTime!);
    }

    // Logika dateModified: Selalu set ke waktu build yang konsisten
    finalDateModified = buildProcessStartTime!;

    // Logika tags (tetap seperti sebelumnya)
    let finalTags: string | string[];
    if (!video.tags || (Array.isArray(video.tags) && video.tags.length === 0) || (typeof video.tags === 'string' && video.tags.trim() === '')) {
        finalTags = generateTagsFromTitle(video.title, undefined, 3);
    } else {
        finalTags = Array.isArray(video.tags) ? video.tags : video.tags.split(',').map(tag => tag.trim());
    }

    return {
      ...video,
      datePublished: finalDatePublished,
      dateModified: finalDateModified,
      tags: finalTags,
    };
  });

  cachedProcessedVideos = processedVideos;

  console.log(`[getAllVideos] Data video diproses dan di-cache pada: ${buildProcessStartTime}`);
  console.log(`[getAllVideos] Contoh video pertama datePublished: ${cachedProcessedVideos[0]?.datePublished}`);
  console.log(`[getAllVideos] Contoh video pertama dateModified: ${cachedProcessedVideos[0]?.dateModified}`);
  console.log(`[getAllVideos] Contoh video pertama tags: ${cachedProcessedVideos[0]?.tags}`);

  return cachedProcessedVideos as VideoData[];
}
