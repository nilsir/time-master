import { afterEach, describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import {
  cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const fixtures: string[] = []

function fixture() {
  const cwd = mkdtempSync(resolve(tmpdir(), 'time-master release '))
  fixtures.push(cwd)
  return cwd
}

function json(path: string, value: unknown) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(value))
}

function archive(cwd: string, browser: 'chrome' | 'firefox', version: string) {
  const dir = browser === 'chrome' ? 'dist' : 'dist-firefox'
  const filename = browser === 'chrome' ? 'time-master.zip' : 'time-master-firefox.zip'
  json(resolve(cwd, dir, 'manifest.json'), { manifest_version: 3, name: '回归测试', version })
  execFileSync('zip', ['-q', '-r', resolve(cwd, filename), browser === 'chrome' ? dir : '.'], {
    cwd: browser === 'chrome' ? cwd : resolve(cwd, dir),
  })
}

async function script(filename: string) {
  const path = resolve(root, 'scripts', filename)
  expect(existsSync(path), `缺少发布脚本：${filename}`).toBe(true)
  return import(/* @vite-ignore */ pathToFileURL(path).href)
}

afterEach(() => {
  for (const cwd of fixtures.splice(0)) rmSync(cwd, { recursive: true, force: true })
})

describe('浏览器发布包版本校验', () => {
  it('读取两个实际 ZIP 内的 manifest 并接受目标版本', async () => {
    const cwd = fixture()
    archive(cwd, 'chrome', '1.2.3')
    archive(cwd, 'firefox', '1.2.3')
    const { verifyPackages } = await script('verify-packages.mjs')

    expect(() => verifyPackages('1.2.3', { cwd })).not.toThrow()
  })

  it.each(['chrome', 'firefox'] as const)('拒绝 %s ZIP 中的旧版本，即使目录已更新', async (browser) => {
    const cwd = fixture()
    archive(cwd, 'chrome', browser === 'chrome' ? '1.1.5' : '1.2.3')
    archive(cwd, 'firefox', browser === 'firefox' ? '1.1.5' : '1.2.3')
    json(resolve(cwd, 'dist/manifest.json'), { version: '1.2.3' })
    json(resolve(cwd, 'dist-firefox/manifest.json'), { version: '1.2.3' })
    const { verifyPackages } = await script('verify-packages.mjs')

    expect(() => verifyPackages('1.2.3', { cwd })).toThrow(/1\.1\.5.*1\.2\.3/)
  })

  it('缺少发布包时失败', async () => {
    const cwd = fixture()
    archive(cwd, 'chrome', '1.2.3')
    const { verifyPackages } = await script('verify-packages.mjs')

    expect(() => verifyPackages('1.2.3', { cwd })).toThrow(/time-master-firefox\.zip/)
  })

  it('通过符号链接执行校验命令时仍拒绝旧版本', () => {
    const cwd = fixture()
    archive(cwd, 'chrome', '1.1.5')
    archive(cwd, 'firefox', '1.1.5')
    const command = resolve(cwd, 'verify.mjs')
    symlinkSync(resolve(root, 'scripts/verify-packages.mjs'), command)

    expect(() => execFileSync(process.execPath, [command, '1.2.3'], { cwd, stdio: 'pipe' }))
      .toThrow(/1\.1\.5.*1\.2\.3/)
  })
})

describe('发布 prepare 顺序', () => {
  it('npm 写入版本后构建，校验通过后才允许提交版本', () => {
    const config = JSON.parse(readFileSync(resolve(root, '.releaserc.json'), 'utf8'))
    const plugins = config.plugins.map((plugin: string | [string, unknown]) => typeof plugin === 'string' ? plugin : plugin[0])
    const prepareIndex = plugins.indexOf('./scripts/release-prepare.mjs')

    expect(prepareIndex).toBeGreaterThan(plugins.indexOf('@semantic-release/npm'))
    expect(prepareIndex).toBeLessThan(plugins.indexOf('@semantic-release/git'))
  })

  it('包版本尚未更新时拒绝构建', async () => {
    const cwd = fixture()
    json(resolve(cwd, 'package.json'), { version: '1.1.5' })
    const { prepare } = await script('release-prepare.mjs')

    await expect(prepare({}, { cwd, env: process.env, nextRelease: { version: '1.2.3' } }))
      .rejects.toThrow(/package\.json.*1\.1\.5.*1\.2\.3/)
    expect(existsSync(resolve(cwd, 'dist'))).toBe(false)
  })

  it('通过符号链接执行构建命令时不会静默跳过', () => {
    const cwd = fixture()
    json(resolve(cwd, 'package.json'), { version: '1.2.3' })
    const command = resolve(cwd, 'prepare.mjs')
    symlinkSync(resolve(root, 'scripts/release-prepare.mjs'), command)

    expect(() => execFileSync(process.execPath, [command], { cwd, stdio: 'pipe' }))
      .toThrow(/Missing script: "build"/)
  })

  it('依次执行 Chrome 构建、Firefox 打包，并替换旧 Chrome ZIP', async () => {
    const cwd = fixture()
    json(resolve(cwd, 'package.json'), {
      version: '1.2.3', type: 'module', scripts: { build: 'node scripts/build-fixture.mjs' },
    })
    mkdirSync(resolve(cwd, 'scripts'), { recursive: true })
    writeFileSync(resolve(cwd, 'scripts/build-fixture.mjs'), `
      import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
      const { version } = JSON.parse(readFileSync('package.json', 'utf8'))
      mkdirSync('dist', { recursive: true })
      writeFileSync('dist/manifest.json', JSON.stringify({ version }))
      writeFileSync('order.json', JSON.stringify(['chrome']))
    `)
    writeFileSync(resolve(cwd, 'scripts/build-firefox.mjs'), `
      import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
      import { execFileSync } from 'node:child_process'
      const manifest = readFileSync('dist/manifest.json', 'utf8')
      mkdirSync('dist-firefox', { recursive: true })
      writeFileSync('dist-firefox/manifest.json', manifest)
      const order = JSON.parse(readFileSync('order.json', 'utf8'))
      writeFileSync('order.json', JSON.stringify([...order, 'firefox']))
      execFileSync('zip', ['-q', '../time-master-firefox.zip', 'manifest.json'], { cwd: 'dist-firefox' })
    `)
    mkdirSync(resolve(cwd, 'dist'), { recursive: true })
    writeFileSync(resolve(cwd, 'dist/stale.js'), '已删除的旧产物')
    archive(cwd, 'chrome', '1.1.5')
    rmSync(resolve(cwd, 'dist/stale.js'))
    const { prepare } = await script('release-prepare.mjs')

    await prepare({}, { cwd, env: process.env, nextRelease: { version: '1.2.3' } })

    expect(JSON.parse(readFileSync(resolve(cwd, 'order.json'), 'utf8'))).toEqual(['chrome', 'firefox'])
    const chromeManifest = JSON.parse(execFileSync('unzip', ['-p', resolve(cwd, 'time-master.zip'), 'dist/manifest.json'], { encoding: 'utf8' }))
    expect(chromeManifest.version).toBe('1.2.3')
    const entries = execFileSync('unzip', ['-Z1', resolve(cwd, 'time-master.zip')], { encoding: 'utf8' })
    expect(entries).not.toContain('stale.js')
    const { verifyPackages } = await script('verify-packages.mjs')
    expect(() => verifyPackages('1.2.3', { cwd })).not.toThrow()
  })
})

describe('Firefox 重复构建', () => {
  it('清除上次 dist-firefox 中已不再产出的文件', () => {
    const cwd = fixture()
    mkdirSync(resolve(cwd, 'scripts'), { recursive: true })
    cpSync(resolve(root, 'scripts/build-firefox.mjs'), resolve(cwd, 'scripts/build-firefox.mjs'))
    symlinkSync(resolve(root, 'node_modules'), resolve(cwd, 'node_modules'), 'dir')
    json(resolve(cwd, 'dist/manifest.json'), { manifest_version: 3, name: '回归测试', version: '1.2.3' })
    mkdirSync(resolve(cwd, 'dist-firefox'), { recursive: true })
    writeFileSync(resolve(cwd, 'dist-firefox/stale.js'), '已删除的旧产物')

    execFileSync(process.execPath, [resolve(cwd, 'scripts/build-firefox.mjs')], { cwd, stdio: 'pipe' })

    expect(existsSync(resolve(cwd, 'dist-firefox/stale.js'))).toBe(false)
    const entries = execFileSync('unzip', ['-Z1', resolve(cwd, 'time-master-firefox.zip')], { encoding: 'utf8' })
    expect(entries).not.toContain('stale.js')
  })
})
