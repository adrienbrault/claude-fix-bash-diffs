import { expect, test } from 'claude-code/testing'

const created = (filePath: string, n: number) => ({
  filePath,
  created: true as const,
  hunks: [{ oldStart: 1, oldLines: 0, newStart: 1, newLines: n, lines: Array.from({ length: n }, (_, i) => `+line ${i + 1}`) }],
})

test('a Bash result reaches the engine cut to eight lines a file, with what was cut said below', async ($, on) => {
  let seen: unknown
  on('ui.render', { component: 'ToolResult' }, ($, e) => {
    seen = e.props.output
    const { Text } = $.ui.resolve(e)

    return <Text>engine row</Text>
  })

  const files = [
    created('/repo/src/setup.py', 67),
    created('/repo/config.json', 14),
    created('/repo/scripts/deploy.sh', 43),
  ]
  const output = { stdout: 'tools-ok', stderr: '', interrupted: false, bashEditDiff: { files, moreFiles: 0 } }

  for (const surface of ['terminal', 'desktop'] as const) {
    const tree = await $.ui.render({
      surface,
      component: 'ToolResult',
      requestId: 'toolu_1',
      props: { tool_use_id: 'toolu_1', tool: 'Bash', output, isErrored: false },
    })

    const drawn = (seen as typeof output).bashEditDiff.files
    expect(drawn.map(f => f.hunks[0]?.lines.length)).toEqual([8, 8, 8])
    expect(drawn.map(f => f.hunks[0]?.newLines)).toEqual([8, 8, 8])
    expect(JSON.stringify(tree)).toContain('+59 lines (setup.py), +6 lines (config.json), +35 lines (deploy.sh)')
  }
})
