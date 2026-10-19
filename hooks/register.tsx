import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

// Claude Code draws up to 40 lines a file under a Bash call; this keeps the first few.
export const MAX_LINES = 8

const isOff = atom({ plugin: 'fix-bash-diffs', key: 'isOff' } as const, false)

type Hunk = { oldStart: number; oldLines: number; newStart: number; newLines: number; lines: string[] }
type FileDiff = { filePath: string; hunks: Hunk[] }
type BashEditDiff = { files: FileDiff[]; moreFiles: number; skipped?: true; unavailable?: true; shared?: true }
type BashOutput = { stdout?: string; stderr?: string; bashEditDiff?: BashEditDiff }

// A file's diff lines; a "\ No newline at end of file" marker is no line of the file.
export const diffLines = (hunks: Hunk[]) =>
  hunks.reduce((n, h) => n + h.lines.filter(l => l[0] !== '\\').length, 0)

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
    if (!diff.files.some(f => diffLines(f.hunks) > MAX_LINES)) return next(e)

    // Claude Code counts a file's (+N -M) from the hunks it is handed, so each
    // file goes to it whole, is drawn on its own, and is clipped here to its
    // header and first lines. A result with a diff draws no "(No output)" line.
    const { bashEditDiff: _, ...rest } = output
    const hasText = `${output.stdout ?? ''}${output.stderr ?? ''}`.trim() !== ''
    const text = hasText ? await next({ ...e, props: { ...e.props, output: rest } }) : null
    const files = await Promise.all(
      diff.files.map(async file => ({
        file,
        hidden: diffLines(file.hunks) - MAX_LINES,
        drawn: await next({
          ...e,
          props: { ...e.props, output: { ...rest, stdout: '', stderr: '', bashEditDiff: { ...diff, files: [file], moreFiles: 0 } } },
        }),
      })),
    )
    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="column">
        {text}
        {files.map(({ file, hidden, drawn }) =>
          hidden > 0 ? (
            <Box key={file.filePath} flexDirection="column">
              <Box flexDirection="column" height={MAX_LINES + 1} overflow="hidden">
                {drawn}
              </Box>
              <Text dimColor>     … {hidden} more lines</Text>
            </Box>
          ) : (
            <Box key={file.filePath} flexDirection="column">
              {drawn}
            </Box>
          ),
        )}
        {diff.moreFiles > 0 ? (
          <Text dimColor>{`  ⎿  … ${diff.moreFiles} more ${diff.moreFiles === 1 ? 'file' : 'files'} changed`}</Text>
        ) : null}
      </Box>
    )
  })
}
