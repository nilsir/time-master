import { execFileSync } from 'node:child_process'
import { readFileSync, realpathSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { verifyPackages } from './verify-packages.mjs'

// 必须排在 @semantic-release/npm 之后，以其写入的新版本重新构建交付物。
export async function prepare(_pluginConfig, { cwd = process.cwd(), env = process.env, nextRelease, logger }) {
  const { version } = JSON.parse(readFileSync(resolve(cwd, 'package.json'), 'utf8'))
  if (version !== nextRelease.version) {
    throw new Error(`package.json 版本 ${version} 与目标版本 ${nextRelease.version} 不一致。`)
  }

  const options = { cwd, env, stdio: 'inherit' }
  execFileSync('npm', ['run', 'build'], options)
  // zip 默认更新已有文件；先删旧包，避免被删除的资源继续留在 ZIP 里。
  rmSync(resolve(cwd, 'time-master.zip'), { force: true })
  execFileSync('zip', ['-q', '-r', 'time-master.zip', 'dist/'], options)
  execFileSync(process.execPath, [resolve(cwd, 'scripts/build-firefox.mjs')], options)
  verifyPackages(nextRelease.version, { cwd })
  logger?.log('两个浏览器发布包已构建，并通过 ZIP 版本校验：%s', nextRelease.version)
}

// 本地和普通 CI 使用当前版本构建，不调用 semantic-release 或外部服务。
if (process.argv[1] && fileURLToPath(import.meta.url) === realpathSync(process.argv[1])) {
  const { version } = JSON.parse(readFileSync(resolve('package.json'), 'utf8'))
  await prepare({}, { nextRelease: { version } })
}
