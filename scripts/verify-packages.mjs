import { execFileSync } from 'node:child_process'
import { readFileSync, realpathSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// 读取最终交付的 ZIP，而不是可能已更新的构建目录。
export function verifyPackages(expectedVersion, { cwd = process.cwd() } = {}) {
  if (typeof expectedVersion !== 'string' || !expectedVersion) {
    throw new Error('必须提供待校验的版本号。')
  }

  const packages = [
    ['time-master.zip', 'dist/manifest.json'],
    ['time-master-firefox.zip', 'manifest.json'],
  ]

  for (const [filename, manifestPath] of packages) {
    let manifest
    try {
      const content = execFileSync('unzip', ['-p', resolve(cwd, filename), manifestPath], {
        encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
      })
      manifest = JSON.parse(content)
    } catch (error) {
      throw new Error(`无法读取 ${filename} 内的 ${manifestPath}。`, { cause: error })
    }

    if (manifest.version !== expectedVersion) {
      throw new Error(`${filename} 版本 ${manifest.version} 与目标版本 ${expectedVersion} 不一致。`)
    }
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === realpathSync(process.argv[1])) {
  const expectedVersion = process.argv[2]
    ?? JSON.parse(readFileSync(resolve('package.json'), 'utf8')).version
  verifyPackages(expectedVersion)
  console.log(`两个 ZIP 内的 manifest 版本均为 ${expectedVersion}。`)
}
