import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

describe('PWA, Manifest ve Üretim Güvenliği Doğrulaması (M8)', () => {
  it('vite.config.ts içinde manifest name ve short_name LİNGO olmalıdır', () => {
    const configPath = path.resolve(__dirname, '../vite.config.ts')
    const configContent = fs.readFileSync(configPath, 'utf-8')

    expect(configContent).toMatch(/name:\s*['"]LİNGO['"]/)
    expect(configContent).toMatch(/short_name:\s*['"]LİNGO['"]/)
    expect(configContent).toMatch(/theme_color:\s*['"]#0f0a2e['"]/)
    expect(configContent).toMatch(/background_color:\s*['"]#0f0a2e['"]/)
    expect(configContent).toMatch(/display:\s*['"]standalone['"]/)
    expect(configContent).toMatch(/orientation:\s*['"]portrait['"]/)
  })

  it('index.html içinde PWA, iOS meta etiketleri ve ikon bağlantıları tam olmalıdır', () => {
    const indexPath = path.resolve(__dirname, '../index.html')
    const indexContent = fs.readFileSync(indexPath, 'utf-8')

    expect(indexContent).toContain('<title>LİNGO</title>')
    expect(indexContent).toMatch(/<meta\s+name="apple-mobile-web-app-title"\s+content="LİNGO"\s*\/?>/)
    expect(indexContent).toMatch(/<meta\s+name="apple-mobile-web-app-capable"\s+content="yes"\s*\/?>/)
    expect(indexContent).toMatch(/<meta\s+name="apple-mobile-web-app-status-bar-style"\s+content="black-translucent"\s*\/?>/)
    expect(indexContent).toContain('viewport-fit=cover')
    expect(indexContent).toContain('user-scalable=no')
    expect(indexContent).toContain('href="/favicon.ico"')
    expect(indexContent).toContain('href="/icons/apple-touch-icon.png"')
    expect(indexContent).toContain('href="/icons/icon-192.png"')
  })

  it('package.json adı lingo olmalıdır', () => {
    const pkgPath = path.resolve(__dirname, '../package.json')
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))

    expect(pkg.name).toBe('lingo')
  })

  it('Tüm PWA ikon dosyaları ve kelime JSON havuzları diskte mevcut olmalıdır', () => {
    const publicDir = path.resolve(__dirname, '../public')
    const iconFiles = [
      'icons/icon-192.png',
      'icons/icon-512.png',
      'icons/icon-512-maskable.png',
      'icons/apple-touch-icon.png',
      'icons/icon.svg',
      'icons/icon-maskable.svg',
      'favicon.ico',
    ]

    for (const file of iconFiles) {
      expect(fs.existsSync(path.join(publicDir, file))).toBe(true)
    }

    const iconSvg = fs.readFileSync(path.join(publicDir, 'icons/icon.svg'), 'utf-8')
    const iconMaskableSvg = fs.readFileSync(path.join(publicDir, 'icons/icon-maskable.svg'), 'utf-8')
    expect(iconSvg).toContain('>BSG<')
    expect(iconMaskableSvg).toContain('>BSG<')
    expect(iconSvg).not.toContain('B-E')
    expect(iconMaskableSvg).not.toContain('B-E')

    const dataFiles = [
      'data/words-4.json',
      'data/words-5.json',
      'data/words-6.json',
      'data/words-7.json',
      'data/bonus-8.json',
    ]

    for (const file of dataFiles) {
      expect(fs.existsSync(path.join(publicDir, file))).toBe(true)
    }
  })

  it('Üretim derlemesi (dist) mevcutsa, DEV çubuğu ve test kısayolları asla yer almamalıdır', () => {
    const distAssetsDir = path.resolve(__dirname, '../dist/assets')
    if (!fs.existsSync(distAssetsDir)) return

    const jsFiles = fs.readdirSync(distAssetsDir).filter(f => f.endsWith('.js'))
    expect(jsFiles.length).toBeGreaterThan(0)

    for (const file of jsFiles) {
      const content = fs.readFileSync(path.join(distAssetsDir, file), 'utf-8')
      expect(content.includes('DEV TEST PANELİ')).toBe(false)
      expect(content.includes('Cevabı Gör')).toBe(false)
      expect(content.includes('🛠')).toBe(false)
      expect(content.includes('devSkipToBonus')).toBe(false)
      expect(content.includes('devSkipToRound4')).toBe(false)
      expect(content.includes('devAutoSolveRound4')).toBe(false)
      expect(content.includes('devSetRound4Time')).toBe(false)
      expect(content.includes('devSkipToNextRound')).toBe(false)
    }
  })
})
