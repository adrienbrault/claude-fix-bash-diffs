# fix-bash-diffs

A Claude Code mod that keeps file-changing Bash commands from flooding the transcript.

When a Bash command creates or edits files, Claude Code draws up to 40 diff lines per file under the call: a fixed limit in its code, with no setting. Write's preview of a new file stops at 10, so a single `cp` or `cat > file` touching a few files fills far more of the screen than the Write would have.

This mod shows each file's header, with its full `(+N -M)` count, and its first 8 diff lines, with `… N more lines` under it:

```
⎿  Created src/setup.py (+67 -0)
     1 +import json
     …
     8 +def main():
   … 59 more lines
```

<table>
  <tr>
    <th>Without the mod: one command creating three 100-line files</th>
    <th>With the mod: one command adding 100 lines to each</th>
  </tr>
  <tr>
    <td valign="top"><img src="docs/before.png" alt="A Bash call drawing 40 lines of each of three new files, then '… 60 more lines' under each" width="400"></td>
    <td valign="top"><img src="docs/after.png" alt="A Bash call drawing 8 diff lines for each of three files, then one dim line: '… +95 lines (alpha.txt), +95 lines (beta.txt), +95 lines (gamma.txt)'" width="400"></td>
  </tr>
</table>

Edit and Write rows are left alone, and so is any Bash row whose files all fit in 8 lines. Only the drawing changes: what the model sees is untouched.

### How it cuts, and what that costs

Claude Code counts a file's `(+N -M)` from the lines it is handed, so the mod hands it each file whole and clips the drawing to the header and first 8 rows. Counts, colours, gutters and paths stay Claude Code's own. On a clipped row:

- ctrl+o shows the files clipped too; `/fix-bash-diffs` off shows them whole.
- `… N more lines` counts diff lines. When long lines wrap, the 8 rows hold fewer lines, so slightly more is hidden than the note says.
- Claude Code's one-time note under the first file diff of a session ("files that changed while this command ran…") is clipped away when that file is long.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install fix-bash-diffs --marketplace adrienbrault/claude-fix-bash-diffs
```

Answer `y` to add the marketplace, then pick a scope.

## Use

`/fix-bash-diffs` turns the cut off and on again for the current session, so you can compare. Rows already on screen redraw.

Claude Code only draws Bash file diffs when the session runs in a git repository, so that is where the mod has something to cut.

To change the limit, edit `MAX_LINES` in `hooks/register.tsx`.

## Requirements

Built and tested on Claude Code 2.1.303. It uses the plugin hooks API, which is early access, and reads the per-file diff Claude Code attaches to a Bash result, an internal field. Either can change in a later release; if Bash rows stop being cut, that is the likely reason.

## Develop

```
claude --plugin-dir /path/to/claude-fix-bash-diffs
claude plugin validate /path/to/claude-fix-bash-diffs
claude plugin test /path/to/claude-fix-bash-diffs
```

## License

MIT
