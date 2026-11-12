import { readFileSync, writeFileSync, cpSync, rmSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

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

// 先清理旧目录，避免已从 Chrome 构建中删除的文件留在 Firefox 发布包里。
const src = resolve(root, 'dist')
const dest = resolve(root, 'dist-firefox')
rmSync(dest, { recursive: true, force: true })
rmSync(resolve(root, 'time-master-firefox.zip'), { force: true })
cpSync(src, dest, { recursive: true })

// 转换 Firefox 的 manifest 配置。
const manifestPath = resolve(dest, 'manifest.json')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))

// 将 service worker 转为 Firefox 支持的 event page。
const bg = manifest.background ?? {}
if (bg.service_worker) {
  manifest.background = {
    scripts: [bg.service_worker],
    ...(bg.type ? { type: bg.type } : {}),
  }
}

// 删除仅 Chrome 使用的字段。
delete manifest.minimum_chrome_version

const patched = { ...manifest, ...firefoxPatch }
writeFileSync(manifestPath, JSON.stringify(patched, null, 2))

console.log('已生成 Firefox manifest。')

// 直接调用已安装的 web-ext，不通过 shell 或临时下载依赖。
execFileSync(
  process.execPath,
  [
    resolve(root, 'node_modules/web-ext/bin/web-ext.js'),
    'build', '--source-dir', 'dist-firefox', '--artifacts-dir', '.',
    '--filename', 'time-master-firefox.zip', '--overwrite-dest',
  ],
  { cwd: root, stdio: 'inherit' },
)

console.log('Firefox 构建完成 → time-master-firefox.zip')
