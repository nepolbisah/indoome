// src/utils/data.js
import fs from 'node:fs/promises'; // Import Node.js File System module
import path from 'node:path';     // Import Node.js Path module
import { fileURLToPath } from 'node:url'; // Import for __dirname equivalent

// Helper to get absolute paths relative to this file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '../../'); // Go up to the project root from src/utils

// Path to your videos.json file
const videosJsonPath = path.join(projectRoot, 'src', 'data', 'videos.json');

/**
 * Interface for video data structure.
 * Note: This is for documentation purposes in JavaScript.
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
 * Membaca file JSON secara langsung dari sistem file.
 * @returns {Promise<VideoData[]>} Array dari objek video.
 */
export async function getAllVideos() {
  try {
    // Read the JSON file content
    const videosRawData = await fs.readFile(videosJsonPath, 'utf-8');
    // Parse the JSON content
    const videosData = JSON.parse(videosRawData);
    console.log(`[getAllVideos] Video data loaded. Total videos: ${videosData.length}`);
    return videosData;
  } catch (error) {
    console.error(`[getAllVideos] Error loading videos.json from ${videosJsonPath}:`, error);
    // You might want to throw the error or return an empty array, depending on how critical this data is.
    throw new Error('Failed to load video data.');
  }
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
    .replace(/[^\w-]+/g, '') // Remove all non-word characters
    .replace(/--+/g, '-'); // Replace multiple hyphens with single
}
