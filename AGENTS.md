<!-- TRELLIS:START -->
# Trellis Instructions

These instructions are for AI assistants working in this project.

Use the `/trellis:start` command when starting a new session to:
- Initialize your developer identity
- Understand current project context
- Read relevant guidelines

Use `@/.trellis/` to learn:
- Development workflow (`workflow.md`)
- Project structure guidelines (`spec/`)
- Developer workspace (`workspace/`)

Keep this managed block so 'trellis update' can refresh the instructions.

<!-- TRELLIS:END -->

## Project Runtime Notes

- Preferred local runtime: Node `25.8.2`
- Version files `.nvmrc` and `.node-version` are pinned to `25.8.2`
- `package.json` allows Node `>=22 <26`, but Node 25.8.2 is the validated target in this worktree

## Next.js Build Guardrails

This project was upgraded to Next.js `16.2.2` to support Node 25 cleanly.

Do not casually remove the `experimental.cpus = 1` and `experimental.workerThreads = true` settings from [next.config.ts](./next.config.ts).

Why:
- On Windows + Node 25, the default multi-process Next build path was failing with `spawn EPERM`
- Forcing a single worker-thread based build pipeline made `npm run build` pass reliably

If you change Next.js versions or build settings, re-run all of:
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`

## Windows npm Note

If `npm install` fails because the global npm cache cannot be written, prefer:

```powershell
npm install --cache .npm-cache
```

The local `.npm-cache/` directory is gitignored.
