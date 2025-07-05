// src/utils/data.js

// Impor langsung dari file JSON
import videosData from '../data/videos.json';

/**
 * Interface untuk struktur data video.
 * Catatan: Ini hanya untuk tujuan dokumentasi di JavaScript.
 * Jika Anda menggunakan TypeScript di bagian lain proyek Astro,
 * Anda mungkin tetap ingin mempertahankan definisi interface di file .d.ts terpisah
 * atau di bagian lain yang memang menggunakan TypeScript.
 * @typedef {object} VideoData
 * @property {string} id
 * @property {string} title
 * @property {string} description
 * @property {string} category
 * @property {string} thumbnail
 * @property {number} thumbnailWidth
 * @property {number} thumbnailHeight
 * @property {string} [datePublished]
 * @property {string} [dateModified]
 * @property {string} embedUrl
 * @property {string} tags
 * @property {string} [previewUrl]
 */

/**
 * Mengambil semua data video dari videos.json.
 * @returns {Promise<VideoData[]>} Array dari objek video.
 */
export async function getAllVideos() {
  console.log(`[getAllVideos] Video data loaded. Total videos: ${videosData.length}`);
  return videosData; // Langsung mengembalikan data yang diimpor
}

/**
 * Mengubah teks menjadi slug yang ramah SEO.
 * @param {string} text - Teks masukan.
 * @returns {string} Slug yang dihasilkan.
 */
export function slugify(text) {
  return text
    .toString()
    .normalize('NFD') // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/[^\w-]+/g, '') // Remove all non-word chars
    .replace(/--+/g, '-'); // Replace multiple hyphens with single
}
