/**
 * seviye-duzeltmeleri.csv'yi kelime-listesi.csv'ye uygular
 * CSV'yi kolay/orta/zor formatında günceller
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DATA_SRC = path.join(ROOT, 'data-src')

// Duzeltmeleri oku
const duzMap = new Map()
fs.readFileSync(path.join(DATA_SRC, 'seviye-duzeltmeleri.csv'), 'utf-8')
  .replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean).slice(1)
  .forEach(r => {
    const p = r.split(';')
    if (p[0]?.trim() && p[1]?.trim()) duzMap.set(p[0].trim(), p[1].trim())
  })

console.log(`Duzeltme sayısı: ${duzMap.size}`)

// CSV'yi oku ve uygula
const csvPath = path.join(DATA_SRC, 'kelime-listesi.csv')
const content = fs.readFileSync(csvPath, 'utf-8')
const hasBOM = content.startsWith('\uFEFF')
const lines = content.replace(/^\uFEFF/, '').split(/\r?\n/)

let changed = 0
const newLines = lines.map((line, i) => {
  if (i === 0 || !line.trim()) return line
  const parts = line.split(';')
  if (parts.length < 3) return line
  const word = parts[0].trim()
  if (duzMap.has(word)) {
    const newLevel = duzMap.get(word)
    if (parts[2].trim() !== newLevel) {
      parts[2] = newLevel
      changed++
      return parts.join(';')
    }
  }
  return line
})

const output = (hasBOM ? '\uFEFF' : '') + newLines.join('\n')
fs.writeFileSync(csvPath, output, 'utf-8')
console.log(`CSV güncellendi: ${changed} satır değişti`)

// Dağılım kontrolü
const updatedContent = fs.readFileSync(csvPath, 'utf-8').replace(/^\uFEFF/, '')
const updatedLines = updatedContent.split(/\r?\n/).filter(Boolean).slice(1)
const dist = { kolay: 0, orta: 0, zor: 0 }
let four = { kolay: 0, orta: 0, zor: 0 }
updatedLines.forEach(l => {
  const p = l.split(';')
  const lv = p[2]?.trim()
  if (lv in dist) dist[lv]++
  if (p[1]?.trim() === '4' && lv in four) four[lv]++
})
console.log('Toplam dağılım:', JSON.stringify(dist))
console.log('4 harf dağılım:', JSON.stringify(four))
