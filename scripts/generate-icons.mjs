// Generate placeholder PNG icons (16/32/48/128) into public/icons/.
// Pure Node with built-in zlib — no native deps.

import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync, crc32 } from 'node:zlib'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'public', 'icons')

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])) >>> 0, 0)
  return Buffer.concat([len, typeBuf, data, crc])
}

function encodePNG(size, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr.writeUInt8(8, 8)
  ihdr.writeUInt8(6, 9)
  const stride = size * 4
  const raw = Buffer.alloc((stride + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0
    rgba.subarray(y * stride, (y + 1) * stride).copy(raw, y * (stride + 1) + 1)
  }
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function inRoundedSquare(x, y, size, radius) {
  if (x >= radius && x <= size - 1 - radius) return true
  if (y >= radius && y <= size - 1 - radius) return true
  const cx = x < radius ? radius : size - 1 - radius
  const cy = y < radius ? radius : size - 1 - radius
  const dx = x - cx
  const dy = y - cy
  return dx * dx + dy * dy <= radius * radius
}

function blend(over, under) {
  const a = over[3] / 255
  return [
    Math.round(over[0] * a + under[0] * (1 - a)),
    Math.round(over[1] * a + under[1] * (1 - a)),
    Math.round(over[2] * a + under[2] * (1 - a)),
    255,
  ]
}

function drawCircleStroke(set, cx, cy, r, w) {
  for (let y = 0; y < set.size; y++) {
    for (let x = 0; x < set.size; x++) {
      const d = Math.hypot(x - cx, y - cy)
      if (d <= r + w / 2 && d >= r - w / 2) {
        set.put(x, y, [255, 255, 255, 255])
      }
    }
  }
}

function drawHand(set, cx, cy, length, angleDeg, thickness) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  const ex = cx + Math.cos(rad) * length
  const ey = cy + Math.sin(rad) * length
  const steps = Math.ceil(length * 2)
  for (let s = 0; s <= steps; s++) {
    const t = s / steps
    const x = cx + (ex - cx) * t
    const y = cy + (ey - cy) * t
    const r = thickness / 2
    for (let dy = -r - 1; dy <= r + 1; dy++) {
      for (let dx = -r - 1; dx <= r + 1; dx++) {
        const px = Math.round(x + dx)
        const py = Math.round(y + dy)
        if (Math.hypot(dx, dy) <= r) {
          set.put(px, py, [255, 255, 255, 255])
        }
      }
    }
  }
}

function generate(size) {
  const radius = Math.round(size * 0.22)
  const accent = [10, 132, 255, 255]
  const transparent = [0, 0, 0, 0]
  const buf = Buffer.alloc(size * size * 4)
  const set = {
    size,
    put(x, y, rgba) {
      if (x < 0 || y < 0 || x >= size || y >= size) return
      const i = (y * size + x) * 4
      const under = [buf[i], buf[i + 1], buf[i + 2], buf[i + 3]]
      const out = blend(rgba, under)
      buf[i] = out[0]
      buf[i + 1] = out[1]
      buf[i + 2] = out[2]
      buf[i + 3] = out[3]
    },
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const rgba = inRoundedSquare(x, y, size, radius) ? accent : transparent
      const i = (y * size + x) * 4
      buf[i] = rgba[0]
      buf[i + 1] = rgba[1]
      buf[i + 2] = rgba[2]
      buf[i + 3] = rgba[3]
    }
  }

  const cx = size / 2 - 0.5
  const cy = size / 2 - 0.5
  const r = size * 0.32
  const stroke = Math.max(1, size * 0.06)
  drawCircleStroke(set, cx, cy, r, stroke)
  drawHand(set, cx, cy, r * 0.55, 0, Math.max(1, size * 0.07))
  drawHand(set, cx, cy, r * 0.85, 90, Math.max(1, size * 0.05))

  return encodePNG(size, buf)
}

function main() {
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })
  for (const s of [16, 32, 48, 128]) {
    const file = join(outDir, `icon-${s}.png`)
    writeFileSync(file, generate(s))
    console.log(`wrote ${file}`)
  }
}

main()
