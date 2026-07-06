# Security Policy

TaskZen is a personal project (Next.js + Supabase), not maintained by a team — but it does handle
real user accounts and data, so security reports are welcome and taken seriously.

## Supported versions

There are no versioned releases. Only the code currently on `main` (as deployed) is supported —
please make sure you're looking at the latest commit before reporting.

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Instead, email **erko.kaar@gmail.com** with:

- A description of the vulnerability and its potential impact.
- Steps to reproduce it (a minimal example helps a lot).
- Any suggested fix, if you have one.

This is a solo-maintained project, so there's no formal SLA, but I'll do my best to acknowledge
reports within a few days and fix confirmed issues promptly. Please give me a reasonable amount of
time to address the issue before disclosing it publicly.

## Scope

In scope: authentication/authorization (Supabase Auth, Row Level Security policies), data exposure
between users, and the Next.js Server Actions / Route Handlers that use the Supabase service-role
key.

Out of scope: issues in third-party dependencies (report those upstream) and purely cosmetic/UI
bugs with no security impact.
