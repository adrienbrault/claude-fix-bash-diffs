import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

// Claude Code draws up to 40 lines a file under a Bash call; this keeps the first few.
export const MAX_LINES = 8

const isOff = atom({ plugin: 'fix-bash-diffs', key: 'isOff' } as const, false)

type Hunk = { oldStart: number; oldLines: number; newStart: number; newLines: number; lines: string[] }
type FileDiff = { filePath: string; hunks: Hunk[]; created?: true; deleted?: true }
type BashEditDiff = { files: FileDiff[]; moreFiles: number; skipped?: true; unavailable?: true; shared?: true }
type BashOutput = { stdout?: string; stderr?: string; bashEditDiff?: BashEditDiff }

const marked = (hunks: Hunk[], mark: string) => hunks.reduce((n, h) => n + h.lines.filter(l => l[0] === mark).length, 0)

// Unified-diff text, which a Code element draws with Claude Code's own gutters and colours.
const toSource = (hunks: Hunk[]) =>
  hunks.map(h => [`@@ -${h.oldStart},${h.oldLines} +${h.newStart},${h.newLines} @@`, ...h.lines].join('\n')).join('\n')

const relative = (path: string, cwd: string) => (path.startsWith(`${cwd}/`) ? path.slice(cwd.length + 1) : path)

const counts = (lines: string[], skip: string) => lines.filter(l => l[0] !== skip && l[0] !== '\\').length

// A "\ No newline at end of file" marker is no line of the file.
const fileLines = (lines: string[]) => lines.filter(l => l[0] !== '\\').length

// Keeps a file's first `max` diff lines, cutting the hunk they end in.
export function head(hunks: Hunk[], max = MAX_LINES): { hunks: Hunk[]; hidden: number } {
  const kept: Hunk[] = []
  let room = max
  let total = 0
  for (const h of hunks) {
    total += fileLines(h.lines)
    if (room <= 0) continue
    const lines = h.lines.slice(0, room)
    room -= fileLines(lines)
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

    const output = e.props.output as BashOutput | undefined
    const diff = e.props.tool === 'Bash' && !e.props.isErrored ? output?.bashEditDiff : undefined
    // A skipped, unavailable or shared diff carries notes of Claude Code's own: leave it to Claude Code.
    if (!output || !diff || !Array.isArray(diff.files) || diff.skipped || diff.unavailable || diff.shared) return next(e)

    const cut = diff.files.map(f => ({ file: f, ...head(f.hunks) }))
    if (!cut.some(c => c.hidden > 0)) return next(e)

    // Claude Code counts a file's (+N -M) from the hunks it draws, so a cut diff
    // handed to it miscounts: the files are drawn here, counted from the whole diff.
    // Handed no diff and no text, Claude Code would draw "(No output)": the text goes alone, or nothing.
    const { bashEditDiff: _, ...rest } = output
    const hasText = `${output.stdout ?? ''}${output.stderr ?? ''}`.trim() !== ''
    const drawn = hasText ? await next({ ...e, props: { ...e.props, output: rest } }) : null
    const cwd = await $.session.cwd()
    const { Box, Text, Code } = $.ui.resolve(e)

    return (
      <Box flexDirection="column">
        {drawn}
        {cut.map(({ file, hunks, hidden }) => (
          <Box key={file.filePath} flexDirection="row">
            <Text dimColor>{'  ⎿  '}</Text>
            <Box flexDirection="column">
              <Text>
                {file.created ? 'Created' : file.deleted ? 'Deleted' : 'Updated'} <Text bold>{relative(file.filePath, cwd)}</Text>{' '}
                <Text dimColor>
                  (+{marked(file.hunks, '+')} -{marked(file.hunks, '-')})
                </Text>
              </Text>
              {hunks.length > 0 ? <Code format="diff" source={toSource(hunks)} path={file.filePath} /> : null}
              {hidden > 0 ? <Text dimColor>… {hidden} more lines</Text> : null}
            </Box>
          </Box>
        ))}
        {diff.moreFiles > 0 ? (
          <Text dimColor>{`  ⎿  … ${diff.moreFiles} more ${diff.moreFiles === 1 ? 'file' : 'files'} changed`}</Text>
        ) : null}
      </Box>
    )
  })
}
