# Claude Project Subagents

Project subagents live here as Markdown files with YAML frontmatter:

```md
---
name: code-reviewer
description: Use to review recent code changes for bugs, regressions, and test gaps.
tools: Read, Grep, Glob, Bash
---

System prompt for the subagent goes here.
```

Keep each subagent focused on one responsibility and grant only the tools it
needs.
