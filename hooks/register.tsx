import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

// Claude Code draws up to 40 lines a file under a Bash call; this keeps the first few.
export const MAX_LINES = 8

const isOff = atom({ plugin: 'fix-bash-diffs', key: 'isOff' } as const, false)

type Hunk = { oldStart: number; oldLines: number; newStart: number; newLines: number; lines: string[] }
type FileDiff = { filePath: string; hunks: Hunk[] }

const counts = (lines: string[], skip: string) => lines.filter(l => l[0] !== skip && l[0] !== '\\').length

// Keeps a file's first `max` diff lines, cutting the hunk they end in.
export function head(hunks: Hunk[], max = MAX_LINES): { hunks: Hunk[]; hidden: number } {
  const kept: Hunk[] = []
  let room = max
  let total = 0
  for (const h of hunks) {
    total += h.lines.length
    if (room <= 0) continue
    const lines = h.lines.slice(0, room)
    room -= lines.length
    kept.push({ ...h, lines, oldLines: counts(lines, '+'), newLines: counts(lines, '-') })
  }

  return { hunks: kept, hidden: total - (max - room) }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'fix-bash-diffs',
      description: 'Turn the cut of Bash file diffs on or off',
    })

    return next(e)
  })

  on('command.run', { command: 'fix-bash-diffs' }, async $ => {
    const off = await update($, isOff, was => !was)

    return { text: off ? 'off, Bash diffs drawn as Claude Code draws them (40 lines a file).' : 'on, 8 lines a file.' }
  })

  on('ui.render', { component: 'ToolResult' }, async ($, e, next) => {
    // Read on every draw, so a toggle redraws the rows already on screen.
    if (await read($, isOff)) return next(e)

    const output = e.props.output as { bashEditDiff?: { files: FileDiff[] } } | undefined
    const diff = e.props.tool === 'Bash' && !e.props.isErrored ? output?.bashEditDiff : undefined
    if (!output || !diff || !Array.isArray(diff.files)) return next(e)

    const cut = diff.files.map(f => ({ file: f, ...head(f.hunks) }))
    const notes = cut
      .filter(c => c.hidden > 0)
      .map(c => `+${c.hidden} lines (${c.file.filePath.split('/').pop()})`)
    if (!notes.length) return next(e)

    const files = cut.map(c => ({ ...c.file, hunks: c.hunks }))
    const drawn = await next({ ...e, props: { ...e.props, output: { ...output, bashEditDiff: { ...diff, files } } } })
    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="column">
        {drawn}
        <Text dimColor>    … {notes.join(', ')}</Text>
      </Box>
    )
  })
}
