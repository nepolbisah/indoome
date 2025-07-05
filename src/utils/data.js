// src/utils/data.js

// Impor langsung dari file JSON dengan atribut 'type: json'
import videosData from '../data/videos.json' assert { type: 'json' };

/**
 * Interface for video data structure.
 * Note: This is for documentation purposes in JavaScript.
 * If you're using TypeScript in other parts of your Astro project,
 * you might still want to keep the interface definition in a separate .d.ts file
 * or in other parts that actually use TypeScript.
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
 * Fetches all video data from videos.json.
 * @returns {Promise<VideoData[]>} An array of video objects.
 */
export async function getAllVideos() {
  console.log(`[getAllVideos] Video data loaded. Total videos: ${videosData.length}`);
  return videosData; // Directly return the imported data
}

/**
 * Converts text into an SEO-friendly slug.
 * @param {string} text - The input text.
 * @returns {string} The generated slug.
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
