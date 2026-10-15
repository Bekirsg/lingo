/**
 * B-E ikonlarını SVG'den PNG'ye dönüştürür.
 * Kullanım: node scripts/generate-icons.mjs
 * Bağımlılık: sharp (npm install -D sharp)
 */

import sharp from 'sharp'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const svgPath = resolve(__dirname, '../public/icons/icon.svg')
const outDir = resolve(__dirname, '../public/icons')

const svg = readFileSync(svgPath)

const sizes = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'icon-512-maskable.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
]

for (const { name, size } of sizes) {
  await sharp(svg)
    .resize(size, size)
    .png()
    .toFile(resolve(outDir, name))
  console.log(`✅ ${name} (${size}×${size})`)
}

console.log('Tüm ikonlar oluşturuldu.')
