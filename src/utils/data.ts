// src/utils/data.ts
import rawAllVideos from '../data/allVideos';

// Definisi interface untuk setiap objek video
export interface VideoData {
  id: string;
  title: string;
  description: string;
  category: string;
  thumbnail: string;
  thumbnailWidth: number;
  thumbnailHeight: number;
  datePublished?: string; // Properti ini sekarang bisa jadi optional karena akan di-generate jika kosong
  dateModified?: string;
  embedUrl: string;
  tags: string;
  previewUrl?: string;
  duration?: number; // Menggunakan number untuk durasi agar lebih mudah diolah
}

// Fungsi helper untuk menghasilkan tanggal acak antara dua tanggal ISO string
function randomDateBetween(start: string, end: string): string {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const startMillis = startDate.getTime();
    const endMillis = endDate.getTime();
    if (startMillis > endMillis) {
      // Jika tanggal mulai lebih besar dari tanggal akhir, kembalikan tanggal akhir
      // Ini bisa terjadi jika defaultSitePublishedDate lebih baru dari currentTime (misal, di masa depan)
      return endDate.toISOString();
    }
    const randomMillis = startMillis + Math.random() * (endMillis - startMillis);
    return new Date(randomMillis).toISOString();
}

export async function getAllVideos(): Promise<VideoData[]> {
  const currentTime = new Date().toISOString();
  // Ambil tanggal publikasi default dari environment variable atau gunakan currentTime sebagai fallback
  const defaultSitePublishedDate = import.meta.env.PUBLIC_SITE_PUBLISHED_DATE || currentTime;

  const processedVideos: VideoData[] = rawAllVideos.map(video => {
    let finalDatePublished = video.datePublished;

    // Jika datePublished belum ada, buat secara acak
    if (!finalDatePublished) {
      finalDatePublished = randomDateBetween(defaultSitePublishedDate, currentTime);
    }

    // Pastikan durasi dalam bentuk number jika ada, untuk Schema.org
    let finalDuration: number | undefined = undefined;
    if (typeof video.duration === 'string') {
        finalDuration = parseInt(video.duration, 10);
        if (isNaN(finalDuration)) {
            finalDuration = undefined; // Set ke undefined jika parsing gagal
        }
    } else if (typeof video.duration === 'number') {
        finalDuration = video.duration;
    }


    return {
      ...video,
      datePublished: finalDatePublished, // Set datePublished yang sudah ditentukan (asli atau random)
      duration: finalDuration, // Pastikan durasi dalam bentuk number
    };
  });

  console.log(`[getAllVideos] Data dari allVideos.ts dimuat. Total video: ${processedVideos.length}`);
  console.log(`[getAllVideos] Tanggal publikasi diacak jika kosong. Contoh video pertama datePublished: ${processedVideos[0]?.datePublished}`);

  return processedVideos;
}
