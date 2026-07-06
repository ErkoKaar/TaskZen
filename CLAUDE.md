# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

# Verification policy

Do not run verification steps on your own initiative — no dev server, no build, no lint/typecheck runs, no browser checks, no tests — unless the user explicitly asks for it in that turn. Make the code change and stop there; wait for the user to request a check.

# Planning policy

Before implementing any change, first present a short plan (what will change, which files, the approach) and wait for the user to explicitly confirm it. Do not start editing code until the user has approved the plan in that turn.

# Git policy

Never run `git commit` or `git push` on your own initiative. Only do so when the user explicitly asks for a commit or push in that turn — approval for one commit/push does not carry over to later changes.

# Long-chat summary policy

After 15 user messages have accumulated in a single chat, summarize everything done so far and all information a new chat would need to continue the work (decisions made, current state, outstanding steps), then advise the user to open a new chat.

# Code quality policy

Write code like a senior developer: think through edge cases, failure modes, and invalid inputs before considering the task done, not just the happy path.

