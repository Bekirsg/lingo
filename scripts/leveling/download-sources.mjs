import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const RAW_DIR = path.resolve(__dirname, '../raw-data')

async function download(url, filename) {
  const dest = path.join(RAW_DIR, filename)
  if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) {
    console.log(`[ATLANDI] ${filename} zaten var (${fs.statSync(dest).size} bayt)`)
    return
  }
  console.log(`[İNDİRİLİYOR] ${url} -> ${filename}...`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  const text = await res.text()
  fs.writeFileSync(dest, text, 'utf8')
  console.log(`  ✅ İndirildi: ${filename} (${text.length} karakter)`)
}

async function main() {
  if (!fs.existsSync(RAW_DIR)) {
    fs.mkdirSync(RAW_DIR, { recursive: true })
  }

  // 1. OpenSubtitles 50k (Konuşma / altyazı derlemi)
  await download(
    'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/tr/tr_50k.txt',
    'opensubtitles-50k.txt'
  )

  // 2. Zemberek 10k (Yazılı / edebiyat & haber derlemi)
  await download(
    'https://raw.githubusercontent.com/ahmetaa/zemberek-nlp/master/normalization/src/test/resources/10000_frequent_turkish_word',
    'zemberek-10k.txt'
  )

  // 3. Azer 1k (Temel sözlükçe)
  await download(
    'https://raw.githubusercontent.com/azer/most-common-turkish-words/master/index.js',
    'azer-1k.js'
  )

  console.log('Tüm harici frekans kaynakları hazır.')
}

main().catch(err => {
  console.error('Hata:', err)
  process.exit(1)
})
