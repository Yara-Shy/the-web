## Module layout

No build step: the site is served exactly as committed, as plain HTML, CSS and native ES modules.

```
index.html            all section markup in page order, import map, hero poster, entry script
public/
  models/             optimized .glb only
  media/              video, posters, images
  fonts/
vendor/               third-party ES modules at pinned versions (three, Draco/KTX2 decoders)
assets-src/           source models and raw video; never deployed
scripts/              offline asset tooling (gltf-transform, image and video encoding); outputs are committed
src/
  main.js             entry: mounts sections that are not hidden; orchestration only
  site.config.js      feature flags for demo variants and experiments
  constants.js        frozen names: states, fallback reasons, data-attributes
  core/               dependency-free helpers: viewport lazy-loading, capability checks, DOM utils
  styles/             tokens.css, base.css
  sections/<name>/    <name>.css, plus <name>.js (mount) only if the section has behaviour
  demos/
    index.js          createDemo(kind, element, options): kind → dynamic import map
    static/           poster fallback
    <kind>/           one folder per demo: viewer-3d/, video-demo/, ...
  scene/              shared 3D: renderer setup, glTF/Draco/Meshopt/KTX2 loaders, render-loop controller, dispose helper
    shaders/          .glsl.js modules exporting shader source strings
```

## Workflow Orchestration

### 1. Plan Node Default

- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately - don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy

- Use subagents liberally to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop

- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Commit After Each Change

- After completing each logical change (feature, fix, refactor), suggest a git commit
- Don't batch multiple unrelated changes into one commit
- Use clear, descriptive commit messages that explain the "why"
- This preserves progress, makes rollbacks easier, and keeps history clean

### 5. Verification Before Done

- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 6. Demand Elegance (Balanced)

- For non-trivial changes: pause and ask "Is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes - don't over-engineer
- Challenge your own work before presenting it

### 7. Autonomous Bug Fixing

- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests - then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review section to `tasks/todo.md`
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.
