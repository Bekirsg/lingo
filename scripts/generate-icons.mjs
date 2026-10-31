/**
 * LİNGO (BSG) ikonlarını SVG'den PNG'ye dönüştürür.
 * Kullanım: node scripts/generate-icons.mjs
 * Bağımlılık: sharp
 */

import sharp from 'sharp'
import { readFileSync, copyFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const svgPath = resolve(__dirname, '../public/icons/icon.svg')
const maskableSvgPath = resolve(__dirname, '../public/icons/icon-maskable.svg')
const outDir = resolve(__dirname, '../public/icons')
const publicDir = resolve(__dirname, '../public')

const svg = readFileSync(svgPath)
const maskableSvg = readFileSync(maskableSvgPath)

// Standart ikonlar (yuvarlatılmış veya normal)
const standardSizes = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon-32.png', size: 32 },
]

for (const { name, size } of standardSizes) {
  await sharp(svg)
    .resize(size, size)
    .png()
    .toFile(resolve(outDir, name))
  console.log(`✅ ${name} (${size}×${size})`)
}

// Maskable ikon (güvenli alan %80 tam dolgu zemin)
await sharp(maskableSvg)
  .resize(512, 512)
  .png()
  .toFile(resolve(outDir, 'icon-512-maskable.png'))
console.log('✅ icon-512-maskable.png (512×512 maskable safe-zone)')

// Favicon.ico kopyası (32x32 PNG bazlı)
copyFileSync(resolve(outDir, 'favicon-32.png'), resolve(publicDir, 'favicon.ico'))
console.log('✅ favicon.ico')

console.log('Tüm ikonlar eksiksiz başarıyla oluşturuldu.')
