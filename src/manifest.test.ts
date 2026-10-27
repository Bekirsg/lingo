import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

describe('Uygulama Adı ve PWA Manifest Doğrulaması (LİNGO)', () => {
  it('vite.config.ts içinde manifest name ve short_name LİNGO olmalıdır', () => {
    const configPath = path.resolve(__dirname, '../vite.config.ts')
    const configContent = fs.readFileSync(configPath, 'utf-8')

    expect(configContent).toMatch(/name:\s*['"]LİNGO['"]/)
    expect(configContent).toMatch(/short_name:\s*['"]LİNGO['"]/)
  })

  it('index.html içinde title ve apple-mobile-web-app-title LİNGO olmalıdır', () => {
    const indexPath = path.resolve(__dirname, '../index.html')
    const indexContent = fs.readFileSync(indexPath, 'utf-8')

    expect(indexContent).toContain('<title>LİNGO</title>')
    expect(indexContent).toMatch(/<meta\s+name="apple-mobile-web-app-title"\s+content="LİNGO"\s*\/?>/)
  })

  it('package.json adı lingo olmalıdır', () => {
    const pkgPath = path.resolve(__dirname, '../package.json')
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))

    expect(pkg.name).toBe('lingo')
  })
})
