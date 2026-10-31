import { spawn } from 'child_process'
import http from 'http'

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }))
    }).on('error', reject)
  })
}

async function run() {
  console.log('Starting preview server on port 4173...')
  const proc = spawn('npx', ['vite', 'preview', '--port', '4173'], { shell: true })

  // Wait for server to be up
  let connected = false
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 200))
    try {
      const res = await get('http://localhost:4173/')
      if (res.status === 200) {
        connected = true
        break
      }
    } catch {
      // retry
    }
  }

  if (!connected) {
    proc.kill()
    throw new Error('Preview server failed to start within timeout')
  }

  console.log('Preview server started successfully.')

  const checks = [
    { name: 'Root index.html', path: '/' },
    { name: 'PWA Manifest', path: '/manifest.webmanifest' },
    { name: 'Service Worker (sw.js)', path: '/sw.js' },
    { name: 'Register SW helper', path: '/registerSW.js' },
    { name: '4-letter words JSON', path: '/data/words-4.json' },
    { name: '5-letter words JSON', path: '/data/words-5.json' },
    { name: '6-letter words JSON', path: '/data/words-6.json' },
    { name: '7-letter words JSON', path: '/data/words-7.json' },
    { name: '8-letter bonus JSON', path: '/data/bonus-8.json' },
    { name: 'Maskable Icon PNG', path: '/icons/icon-512-maskable.png' },
    { name: 'Standard 192 Icon PNG', path: '/icons/icon-192.png' },
    { name: 'Apple Touch Icon PNG', path: '/icons/apple-touch-icon.png' },
    { name: 'Favicon ICO', path: '/favicon.ico' },
  ]

  let allPassed = true
  for (const check of checks) {
    try {
      const res = await get(`http://localhost:4173${check.path}`)
      if (res.status === 200) {
        console.log(`[PASS] ${check.name} -> HTTP 200 (Length: ${res.body.length})`)
        if (check.path === '/manifest.webmanifest') {
          const json = JSON.parse(res.body)
          if (json.name === 'LİNGO' && json.short_name === 'LİNGO' && json.display === 'standalone' && json.orientation === 'portrait') {
            console.log('       Manifest content verified: name=LİNGO, display=standalone, orientation=portrait')
          } else {
            console.error('       Manifest content mismatch!', json)
            allPassed = false
          }
        }
        if (check.path === '/sw.js') {
          if (res.body.includes('data/bonus-8.json') && res.body.includes('cleanupOutdatedCaches')) {
            console.log('       Service worker verified: precaches data/bonus-8.json and includes cache cleanup')
          } else {
            console.error('       sw.js missing expected precache patterns!')
            allPassed = false
          }
        }
      } else {
        console.error(`[FAIL] ${check.name} -> HTTP ${res.status}`)
        allPassed = false
      }
    } catch (err) {
      console.error(`[FAIL] ${check.name} -> Error: ${err.message}`)
      allPassed = false
    }
  }

  // Terminate preview
  proc.kill()
  // Windows kill process tree
  try {
    spawn('taskkill', ['/pid', proc.pid.toString(), '/f', '/t'], { shell: true })
  } catch {}

  if (!allPassed) {
    process.exit(1)
  }
  console.log('\nAll preview HTTP and PWA asset checks passed successfully!')
}

run().catch(err => {
  console.error(err)
  process.exit(1)
})
