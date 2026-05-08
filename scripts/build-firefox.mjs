import { readFileSync, writeFileSync, cpSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const firefoxPatch = {
  browser_specific_settings: {
    gecko: {
      id: 'time-master@nilsir.com',
      strict_min_version: '140.0',
      data_collection_permissions: {
        required: ['none'],
        optional: [],
      },
    },
    gecko_android: {
      strict_min_version: '142.0',
    },
  },
}

// Copy dist/ → dist-firefox/
const src = resolve(root, 'dist')
const dest = resolve(root, 'dist-firefox')
mkdirSync(dest, { recursive: true })
cpSync(src, dest, { recursive: true })

// Patch manifest.json
const manifestPath = resolve(dest, 'manifest.json')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))

// Firefox < 121 does not support background.service_worker;
// convert to background.scripts (event page) which Firefox supports.
const bg = manifest.background ?? {}
if (bg.service_worker) {
  manifest.background = {
    scripts: [bg.service_worker],
    ...(bg.type ? { type: bg.type } : {}),
  }
}

// Remove minimum_chrome_version (Chrome-only field)
delete manifest.minimum_chrome_version

const patched = { ...manifest, ...firefoxPatch }
writeFileSync(manifestPath, JSON.stringify(patched, null, 2))

console.log('Firefox manifest patched.')

// Package with web-ext
execSync(
  `npx web-ext build --source-dir dist-firefox --artifacts-dir . --filename time-master-firefox.zip --overwrite-dest`,
  { cwd: root, stdio: 'inherit' },
)

console.log('Firefox build complete → time-master-firefox.zip')
