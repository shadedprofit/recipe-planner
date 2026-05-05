# Claude Code Project Extensions

This directory is for Claude Code-native project configuration and extensions.
The repo-level Claude entrypoint remains `../CLAUDE.md`.

Recommended contents:

- `agents/`: project subagents, one Markdown file per agent, using Claude
  Code's YAML-frontmatter format.
- `commands/`: optional project slash commands.
- `settings.json`: optional shared project settings safe to commit.
- `settings.local.json`: personal settings; keep this untracked.

Do not put product or architecture truth only in this directory. Use
`../README.md` and `../ARCHITECTURE.md` for that.
