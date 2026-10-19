# short-diffs

A Claude Code mod that keeps file-changing Bash commands from flooding the transcript.

When a Bash command creates or edits files, Claude Code draws up to 40 diff lines per file under the call. Write's preview stops at 10 and an Edit shows just its change and a little context, so a single `cp` or `cat > file` touching a few files can fill several screens.

This mod shows the first 10 diff lines of each file, the same as Write's preview, and ends the row with one dim line saying what was cut:

```
… +57 lines (setup.py), +4 lines (config.json), +33 lines (deploy.sh)
```

Edit and Write rows are left alone. Only the drawing changes: what the model sees is untouched.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install short-diffs --marketplace adrienbrault/claude-fix-bash-diffs
```

Answer `y` to add the marketplace, then pick a scope.

## Use

`/short-diffs` turns the cut off and on again for the current session, so you can compare. Rows already on screen redraw.

Claude Code only draws Bash file diffs when the session runs in a git repository, so that is where the mod has something to cut.

To change the limit, edit `MAX_LINES` in `hooks/register.tsx`.

## Develop

```
claude --plugin-dir /path/to/claude-fix-bash-diffs
claude plugin validate /path/to/claude-fix-bash-diffs
claude plugin test /path/to/claude-fix-bash-diffs
```

## License

MIT
