---
name: craftdriver
description: Use Craftdriver to create, run, and debug real-browser tests, browser automation flows, mobile emulation checks, screenshots, or WebDriver-based verification in this project.
---

# craftdriver — SKILL

Modern BiDi-first WebDriver library for Node.js. Playwright ergonomics, WebDriver standards-compliance, no AI in the hot path.

## Core loop

`navigate → find → action → assert`

Every action and every `expect(locator).to…()` auto-waits. Never add `sleep()` or `setTimeout()`.

## Selector preference

`By.testId > By.role({name}) > By.labelText > By.text({exact:true}) > By.css > By.xpath`

Use stable semantic selectors. Check `await locator.count()` before acting on a selector you are unsure exists.

## Rules

1. Use `expect(locator).to…()` for assertions; never hand-roll retry loops.
2. Handle `CraftdriverError` by stable `code`, not error text. Read `node_modules/craftdriver/docs/error-codes.md` when needed.
3. Import only from `craftdriver`, never its internal source paths.
4. Launch with `enableBiDi: true` for network, logs, tracing, or init scripts.
5. Use the library for committed tests, CLI for exploration, and MCP for a tool-calling host.

## Progressive references

- Test method reference: `node_modules/craftdriver/skills/craftdriver/cheatsheet.md`
- Login, uploads, network waits, accessibility, tracing, and virtual-clock recipes: `node_modules/craftdriver/skills/craftdriver/patterns.md`
- Agent CLI: `node_modules/craftdriver/skills/craftdriver/cli.md`
- CLI details: `node_modules/craftdriver/docs/cli.md`
- MCP tools and stdio setup: `node_modules/craftdriver/docs/mcp.md`

For CLI/MCP, begin with a snapshot and use its `ref=eN` selectors. Refs are invalidated after a snapshot or navigation; take a fresh snapshot after `NO_MATCH`.
