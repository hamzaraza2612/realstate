// Verifies src/i18n/en.ts and src/i18n/ar.ts define exactly the same keys, and that every literal
// t('…') key used in app/ and src/ exists in en.ts. Run: `npm run check:i18n`.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const keysOf = (file) => new Set([...readFileSync(join(root, file), 'utf8').matchAll(/^\s*'([^']+)':/gm)].map((m) => m[1]))

const en = keysOf('src/i18n/en.ts')
const ar = keysOf('src/i18n/ar.ts')
const problems = []
for (const key of en) if (!ar.has(key)) problems.push(`missing in ar.ts: ${key}`)
for (const key of ar) if (!en.has(key)) problems.push(`missing in en.ts: ${key}`)

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return walk(path)
    return /\.(ts|tsx)$/.test(name) ? [path] : []
  })
}

for (const file of [...walk(join(root, 'app')), ...walk(join(root, 'src'))]) {
  const source = readFileSync(file, 'utf8')
  for (const match of source.matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'/g)) {
    if (!en.has(match[1])) problems.push(`${file.replace(root, '')}: unknown key ${match[1]}`)
  }
}

if (problems.length) {
  console.error(problems.join('\n'))
  process.exit(1)
}
console.log(`i18n OK — ${en.size} keys in both en.ts and ar.ts; every literal t() key resolves.`)
