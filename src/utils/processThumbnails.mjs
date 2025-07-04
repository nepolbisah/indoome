// src/utils/processThumbnails.mjs

import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import rawVideosData from '../data/videos.json' with { type: 'json' };

// --- FUNGSI SLUGIFY ---
function slugify(text) {
    return text
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-');
}
// --- AKHIR FUNGSI SLUGIFY ---

const videosData = rawVideosData;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.join(__dirname, '../../');
const publicDir = path.join(projectRoot, 'public');

const OPTIMIZED_IMAGES_SUBDIR = 'picture';
const optimizedThumbnailsDir = path.join(publicDir, OPTIMIZED_IMAGES_SUBDIR);

// --- Perubahan Utama: Output ke src/data/allVideos.ts ---
const OUTPUT_TS_PATH = path.resolve(__dirname, '../data/allVideos.ts');
// --- AKHIR Perubahan Utama ---

const YOUR_DOMAIN = process.env.PUBLIC_SITE_URL;
if (!YOUR_DOMAIN) {
    console.error("Error: PUBLIC_SITE_URL is not defined in environment variables. Please check your .env file and ensure it's loaded.");
    process.exit(1);
}

const PLACEHOLDER_THUMBNAIL_PATH = `${YOUR_DOMAIN}/placeholder.webp`;
const DEFAULT_FALLBACK_WIDTH = 300;
const DEFAULT_FALLBACK_HEIGHT = 168;
const OPTIMIZED_THUMBNAIL_WIDTH = 300;

// --- BARU: Tanggal dan Fungsi Tag (dipindahkan dari data.ts) ---
const BUILD_PROCESS_START_TIME = new Date().toISOString(); // Diinisialisasi di sini, sekali per eksekusi script ini

function randomDateBetween(start, end) {
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

function generateTagsFromTitle(title, currentTags, numberOfTags = 3) {
    let existingTags = [];
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
        'adalah', 'sebagai', 'tidak', 'saya', 'ke', 'mereka'
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
// --- AKHIR BARU: Tanggal dan Fungsi Tag ---


async function processThumbnails() {
    console.log('Starting thumbnail processing...');
    console.log(`[processThumbnails.mjs] BUILD_PROCESS_START_TIME set to: ${BUILD_PROCESS_START_TIME}`);

    await fs.mkdir(optimizedThumbnailsDir, { recursive: true });
    const outputTsDir = path.dirname(OUTPUT_TS_PATH);
    await fs.mkdir(outputTsDir, { recursive: true });

    const processedVideos = [];
    const datePublishedRandomRangeStart = process.env.PUBLIC_SITE_PUBLISHED_DATE || BUILD_PROCESS_START_TIME;


    for (const video of videosData) {
        const videoSlug = slugify(video.title || 'untitled-video');
        const thumbnailFileName = `${videoSlug}-${video.id}.webp`;

        const outputPath = path.join(optimizedThumbnailsDir, thumbnailFileName);
        const relativeThumbnailPath = `/${OPTIMIZED_IMAGES_SUBDIR}/${thumbnailFileName}`;

        // --- BARU: Logika penulisan datePublished, dateModified, dan tags di sini ---
        let finalDatePublished = video.datePublished;
        let finalDateModified = video.dateModified;
        let finalTags = video.tags;

        if (!finalDatePublished) {
            finalDatePublished = randomDateBetween(datePublishedRandomRangeStart, BUILD_PROCESS_START_TIME);
        }
        finalDateModified = BUILD_PROCESS_START_TIME; // Selalu set ke waktu build script ini dieksekusi

        if (!finalTags || (Array.isArray(finalTags) && finalTags.length === 0) || (typeof finalTags === 'string' && finalTags.trim() === '')) {
            finalTags = generateTagsFromTitle(video.title, undefined, 3);
        } else {
            finalTags = Array.isArray(finalTags) ? finalTags : finalTags.split(',').map(tag => tag.trim());
        }
        // --- AKHIR BARU ---

        try {
            if (video.thumbnail) {
                let inputBuffer;

                if (video.thumbnail.startsWith('http')) {
                    console.log(`Downloading thumbnail for ${video.title} from ${video.thumbnail}`);
                    const response = await fetch(video.thumbnail);
                    if (!response.ok) {
                        throw new Error(`Failed to download thumbnail: ${response.statusText}`);
                    }
                    inputBuffer = Buffer.from(await response.arrayBuffer());
                } else {
                    const localInputPath = path.join(publicDir, video.thumbnail);
                    try {
                        await fs.access(localInputPath);
                        inputBuffer = await fs.readFile(localInputPath);
                        console.log(`Using local thumbnail for ${video.title}: ${localInputPath}`);
                    } catch (localFileError) {
                        console.error(`[ERROR] Local thumbnail file not found for ${video.title}: ${localFileError.message}`);
                        throw new Error(`Local thumbnail not found or accessible: ${localFileError.message}`);
                    }
                }

                const optimizedBuffer = await sharp(inputBuffer)
                    .resize({ width: OPTIMIZED_THUMBNAIL_WIDTH, withoutEnlargement: true })
                    .webp({ quality: 70 })
                    .toBuffer();

                const optimizedMetadata = await sharp(optimizedBuffer).metadata();
                const finalWidth = optimizedMetadata.width || DEFAULT_FALLBACK_WIDTH;
                const finalHeight = optimizedMetadata.height || DEFAULT_FALLBACK_HEIGHT;

                await fs.writeFile(outputPath, optimizedBuffer);
                console.log(`Processed and saved: ${outputPath} (Dimensions: ${finalWidth}x${finalHeight})`);

                processedVideos.push({
                    ...video,
                    thumbnail: relativeThumbnailPath,
                    thumbnailWidth: finalWidth,
                    thumbnailHeight: finalHeight,
                    datePublished: finalDatePublished, // <-- Ditambahkan
                    dateModified: finalDateModified,   // <-- Ditambahkan
                    tags: finalTags,                   // <-- Ditambahkan
                });

            } else {
                console.warn(`No thumbnail URL found for video: ${video.title}. Using placeholder.`);
                processedVideos.push({
                    ...video,
                    thumbnail: PLACEHOLDER_THUMBNAIL_PATH,
                    thumbnailWidth: DEFAULT_FALLBACK_WIDTH,
                    thumbnailHeight: DEFAULT_FALLBACK_HEIGHT,
                    datePublished: finalDatePublished, // <-- Ditambahkan
                    dateModified: finalDateModified,   // <-- Ditambahkan
                    tags: finalTags,                   // <-- Ditambahkan
                });
            }
        } catch (error) {
            console.error(`Error processing thumbnail for video ${video.id} (${video.title}):`, error.message);
            processedVideos.push({
                ...video,
                thumbnail: PLACEHOLDER_THUMBNAIL_PATH,
                thumbnailWidth: DEFAULT_FALLBACK_WIDTH,
                thumbnailHeight: DEFAULT_FALLBACK_HEIGHT,
                datePublished: finalDatePublished, // <-- Ditambahkan (tetap atur meskipun ada error thumbnail)
                dateModified: finalDateModified,   // <-- Ditambahkan
                tags: finalTags,                   // <-- Ditambahkan
            });
        }
    }

    // --- Perubahan Utama: Tulis langsung ke allVideos.ts ---
    const outputContent = `import type { VideoData } from './data'; // Diperbarui path import\n\nconst allVideos: VideoData[] = ${JSON.stringify(processedVideos, null, 2)};\n\nexport default allVideos;\n`;
    await fs.writeFile(OUTPUT_TS_PATH, outputContent, 'utf-8');
    console.log(`Successfully pre-processed video data to ${OUTPUT_TS_PATH}`);
    // --- AKHIR Perubahan Utama ---

    console.log('Thumbnail processing complete.');
}

processThumbnails().catch(console.error);
