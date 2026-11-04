import assert from 'node:assert/strict'
import { test } from 'node:test'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

test('migration history pins the authorized manifest and rejects allowlist expansion or future deletion', () => {
  const root = fileURLToPath(new URL('../../', import.meta.url))
  const bytes = readFileSync(path.join(root, 'schema/baseline-reset.json'))
  const manifest = JSON.parse(bytes.toString('utf8'))
  const directory = mkdtempSync(path.join(tmpdir(), 'cms-migration-history-'))
  const git = (...args: string[]) =>
    execFileSync('git', args, { cwd: directory, encoding: 'utf8', stdio: 'pipe' }).trim()
  const save = (name: string, value: string | Buffer) => {
    const filename = path.join(directory, name)
    mkdirSync(path.dirname(filename), { recursive: true })
    writeFileSync(filename, value)
  }
  const commit = () => {
    git('add', '-A')
    git(
      '-c',
      'commit.gpgsign=false',
      '-c',
      'core.hooksPath=/dev/null',
      '-c',
      'user.name=CMS test',
      '-c',
      'user.email=cms@example.test',
      'commit',
      '-m',
      'Disposable fixture',
    )
    return git('rev-parse', 'HEAD')
  }
  const guard = (base: string) =>
    spawnSync(process.execPath, [path.join(root, 'scripts/check-migration-history.mjs')], {
      cwd: directory,
      env: { ...process.env, BASE_SHA: base },
      encoding: 'utf8',
    })
  try {
    git('init', '-q')
    save('src/migrations/existing.ts', 'Applied unrelated migration\n')
    const initial = commit()
    save('schema/baseline-reset.json', bytes)
    save('src/migrations/new-baseline.ts', 'New multimedia baseline\n')
    assert.equal(guard(initial).status, 0)
    const existingBlob = git('rev-parse', `${initial}:src/migrations/existing.ts`)
    manifest.removedGitBlobs['src/migrations/existing.ts'] = existingBlob
    save('schema/baseline-reset.json', JSON.stringify(manifest))
    unlinkSync(path.join(directory, 'src/migrations/existing.ts'))
    const expanded = guard(initial)
    assert.notEqual(expanded.status, 0)
    assert.match(expanded.stderr, /reset manifest is immutable/)
    save('schema/baseline-reset.json', bytes)
    save('src/migrations/existing.ts', 'Applied unrelated migration\n')
    const future = commit()
    unlinkSync(path.join(directory, 'src/migrations/new-baseline.ts'))
    const deleted = guard(future)
    assert.notEqual(deleted.status, 0)
    assert.match(deleted.stderr, /Established migrations are immutable/)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
