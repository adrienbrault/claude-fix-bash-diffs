import { expect, test } from 'claude-code/testing'

const created = (filePath: string, n: number) => ({
  filePath,
  created: true as const,
  hunks: [{ oldStart: 1, oldLines: 0, newStart: 1, newLines: n, lines: Array.from({ length: n }, (_, i) => `+line ${i + 1}`) }],
})

const bashResult = (files: ReturnType<typeof created>[]) => ({
  stdout: 'tools-ok',
  stderr: '',
  interrupted: false,
  bashEditDiff: { files, moreFiles: 0 },
})

const SURFACES = ['terminal', 'desktop'] as const

test('a long Bash diff is drawn by Claude Code a file at a time, each whole, clipped with a note under it', async ($, on) => {
  const seen: unknown[] = []
  on('ui.render', { component: 'ToolResult' }, ($, e) => {
    seen.push(e.props.output)
    const { Text } = $.ui.resolve(e)

    return <Text>engine row {seen.length}</Text>
  })

  const files = [created('/repo/src/setup.py', 67), created('/repo/config.json', 6), created('/repo/scripts/deploy.sh', 43)]
  const output = bashResult(files)

  for (const surface of SURFACES) {
    seen.length = 0
    const tree = JSON.stringify(
      await $.ui.render({
        surface,
        component: 'ToolResult',
        requestId: 'toolu_1',
        props: { tool_use_id: 'toolu_1', tool: 'Bash', output, isErrored: false },
      }),
    )

    // The command's own output once, then each file whole, on its own.
    expect(seen).toEqual([
      { stdout: 'tools-ok', stderr: '', interrupted: false },
      ...files.map(f => ({ stdout: '', stderr: '', interrupted: false, bashEditDiff: { files: [f], moreFiles: 0 } })),
    ])
    // The two long files are clipped to their header and eight lines; the short one is not.
    expect(tree.split('"height":9,"overflow":"hidden"').length - 1).toBe(2)
    expect(tree).toContain('["     … ","59"," more lines"]')
    expect(tree).toContain('["     … ","35"," more lines"]')
  }
})

test('a Bash diff short enough is left to Claude Code', async ($, on) => {
  const seen: unknown[] = []
  on('ui.render', { component: 'ToolResult' }, ($, e) => {
    seen.push(e.props.output)
    const { Text } = $.ui.resolve(e)

    return <Text>engine row</Text>
  })

  const output = bashResult([created('/repo/a.txt', 3)])
  for (const surface of SURFACES) {
    seen.length = 0
    await $.ui.render({
      surface,
      component: 'ToolResult',
      requestId: 'toolu_2',
      props: { tool_use_id: 'toolu_2', tool: 'Bash', output, isErrored: false },
    })

    expect(seen).toEqual([output])
  }
})
