import { createHash } from 'node:crypto';
import {
    existsSync,
    mkdirSync,
    readFileSync,
    readdirSync,
    unlinkSync,
    writeFileSync
} from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = dirname(scriptDirectory);
const emmaAssets = join(
    repositoryRoot,
    'The HIGH Council of Magic',
    'emma-page',
    'assets'
);
const songsDirectory = join(emmaAssets, 'songs');
const coversDirectory = join(emmaAssets, 'pictures', 'covers');
const catalogJsonPath = join(emmaAssets, 'songs.json');
const catalogScriptPath = join(emmaAssets, 'songs-data.js');
const coverCropPerEdge = 110;

mkdirSync(songsDirectory, { recursive: true });
mkdirSync(coversDirectory, { recursive: true });

function readSynchsafeInteger(bytes, offset) {
    return (bytes[offset] << 21)
        | (bytes[offset + 1] << 14)
        | (bytes[offset + 2] << 7)
        | bytes[offset + 3];
}

function readFrameId(bytes, offset, length) {
    return bytes.subarray(offset, offset + length).toString('latin1');
}

function findTextEnd(bytes, start, end, encoding) {
    if (encoding === 1 || encoding === 2) {
        for (let index = start; index + 1 < end; index += 2) {
            if (bytes[index] === 0 && bytes[index + 1] === 0) {
                return index + 2;
            }
        }
    } else {
        const terminator = bytes.indexOf(0, start);
        if (terminator !== -1 && terminator < end) {
            return terminator + 1;
        }
    }

    return end;
}

function decodeUtf16(bytes, bigEndian = false) {
    let content = bytes;

    if (content[0] === 0xff && content[1] === 0xfe) {
        content = content.subarray(2);
        bigEndian = false;
    } else if (content[0] === 0xfe && content[1] === 0xff) {
        content = content.subarray(2);
        bigEndian = true;
    }

    if (bigEndian) {
        const swapped = Buffer.alloc(content.length);
        for (let index = 0; index + 1 < content.length; index += 2) {
            swapped[index] = content[index + 1];
            swapped[index + 1] = content[index];
        }
        content = swapped;
    }

    return new TextDecoder('utf-16le').decode(content);
}

function decodeTextFrame(frame) {
    if (frame.length < 2) {
        return '';
    }

    const encoding = frame[0];
    const content = frame.subarray(1);
    let value;

    if (encoding === 1) {
        value = decodeUtf16(content);
    } else if (encoding === 2) {
        value = decodeUtf16(content, true);
    } else if (encoding === 3) {
        value = new TextDecoder('utf-8').decode(content);
    } else {
        value = new TextDecoder('windows-1252').decode(content);
    }

    return value.replaceAll('\0', '').trim();
}

function parsePictureFrame(bytes, frameId, frameStart, frameEnd) {
    let cursor = frameStart;
    const encoding = bytes[cursor];
    cursor += 1;
    let mimeType;

    if (frameId === 'PIC') {
        const format = readFrameId(bytes, cursor, 3).toLowerCase();
        mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
        cursor += 3;
    } else {
        const mimeEnd = bytes.indexOf(0, cursor);
        if (mimeEnd === -1 || mimeEnd >= frameEnd) {
            return null;
        }
        mimeType = bytes.subarray(cursor, mimeEnd).toString('latin1');
        cursor = mimeEnd + 1;
    }

    cursor += 1;
    cursor = findTextEnd(bytes, cursor, frameEnd, encoding);

    if (cursor >= frameEnd) {
        return null;
    }

    const image = bytes.subarray(cursor, frameEnd);
    let extension = mimeType.includes('png') ? 'png' : 'jpg';

    if (image.subarray(0, 8).toString('hex') === '89504e470d0a1a0a') {
        extension = 'png';
        mimeType = 'image/png';
    } else if (image[0] === 0xff && image[1] === 0xd8) {
        extension = 'jpg';
        mimeType = 'image/jpeg';
    }

    return { image, extension, mimeType };
}

function parseId3(fileBytes) {
    const metadata = {};

    if (fileBytes.length < 10 || readFrameId(fileBytes, 0, 3) !== 'ID3') {
        return metadata;
    }

    const version = fileBytes[3];
    const tagEnd = Math.min(
        fileBytes.length,
        10 + readSynchsafeInteger(fileBytes, 6)
    );
    let offset = 10;

    if ((fileBytes[5] & 0x40) !== 0 && offset + 4 <= tagEnd) {
        const extendedSize = version === 4
            ? readSynchsafeInteger(fileBytes, offset)
            : fileBytes.readUInt32BE(offset);
        offset += version === 4 ? extendedSize : extendedSize + 4;
    }

    const textFrameNames = version === 2
        ? { TT2: 'title', TP1: 'artist', TAL: 'album' }
        : { TIT2: 'title', TPE1: 'artist', TALB: 'album' };

    while (offset < tagEnd) {
        const versionTwo = version === 2;
        const headerSize = versionTwo ? 6 : 10;
        if (offset + headerSize > tagEnd) {
            break;
        }

        const frameId = readFrameId(fileBytes, offset, versionTwo ? 3 : 4);
        const frameSize = versionTwo
            ? (fileBytes[offset + 3] << 16)
                | (fileBytes[offset + 4] << 8)
                | fileBytes[offset + 5]
            : version === 4
                ? readSynchsafeInteger(fileBytes, offset + 4)
                : fileBytes.readUInt32BE(offset + 4);

        if (!frameId.trim() || frameSize <= 0) {
            break;
        }

        const frameStart = offset + headerSize;
        const frameEnd = Math.min(frameStart + frameSize, tagEnd);
        const property = textFrameNames[frameId];

        if (property) {
            metadata[property] = decodeTextFrame(
                fileBytes.subarray(frameStart, frameEnd)
            );
        } else if (!metadata.picture && (frameId === 'APIC' || frameId === 'PIC')) {
            metadata.picture = parsePictureFrame(
                fileBytes,
                frameId,
                frameStart,
                frameEnd
            );
        }

        offset = frameEnd;
    }

    return metadata;
}

function slugify(value) {
    return value
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 48);
}

function encodeAssetPath(...parts) {
    return parts.map(part => encodeURIComponent(part)).join('/');
}

function writeIfChanged(filePath, content) {
    if (!existsSync(filePath) || !readFileSync(filePath).equals(content)) {
        writeFileSync(filePath, content);
    }
}

async function cropCover(picture, trackName) {
    const image = sharp(picture.image);
    const metadata = await image.metadata();
    const croppedWidth = metadata.width - coverCropPerEdge * 2;
    const croppedHeight = metadata.height - coverCropPerEdge * 2;

    if (croppedWidth <= 0 || croppedHeight <= 0) {
        throw new Error(
            `The embedded cover for "${trackName}" is too small to crop by ${coverCropPerEdge}px on every edge.`
        );
    }

    return image
        .extract({
            left: coverCropPerEdge,
            top: coverCropPerEdge,
            width: croppedWidth,
            height: croppedHeight
        })
        .png()
        .toBuffer();
}

for (const fileName of readdirSync(coversDirectory)) {
    if (/^auto-.*\.(png|jpe?g)$/i.test(fileName)) {
        unlinkSync(join(coversDirectory, fileName));
    }
}

const songFiles = readdirSync(songsDirectory)
    .filter(fileName => extname(fileName).toLowerCase() === '.mp3')
    .sort((first, second) => first.localeCompare(second, 'en', { numeric: true }));

const catalog = [];

for (const fileName of songFiles) {
    const fileBytes = readFileSync(join(songsDirectory, fileName));
    const metadata = parseId3(fileBytes);
    const fileStem = fileName.slice(0, -extname(fileName).length);
    const hash = createHash('sha1').update(fileName).digest('hex').slice(0, 10);
    const slug = slugify(fileStem) || 'track';
    let cover = null;

    if (metadata.picture) {
        const coverFileName = `auto-${slug}-${hash}.png`;
        const croppedCover = await cropCover(metadata.picture, fileName);
        writeIfChanged(
            join(coversDirectory, coverFileName),
            croppedCover
        );
        cover = encodeAssetPath('assets', 'pictures', 'covers', coverFileName);
    }

    catalog.push({
        title: metadata.title || fileStem,
        artist: metadata.artist || null,
        album: metadata.album || null,
        file: encodeAssetPath('assets', 'songs', fileName),
        cover
    });
}

const catalogJson = `${JSON.stringify(catalog, null, 2)}\n`;
const catalogScript = `window.SONG_CATALOG = ${catalogJson.replaceAll('<', '\\u003c')}`;

writeIfChanged(catalogJsonPath, Buffer.from(catalogJson));
writeIfChanged(catalogScriptPath, Buffer.from(catalogScript));

console.log(`Generated song catalog with ${catalog.length} track(s).`);
for (const track of catalog) {
    console.log(`- ${track.title}${track.artist ? ` — ${track.artist}` : ''}`);
}
