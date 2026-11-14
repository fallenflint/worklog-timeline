# Worklog Timeline

Turn an Obsidian canvas into a worklog. Each card is a task, arrows are "what came next",
and the plugin keeps track of where you are.

[Русская версия](README.ru.md)

## Features

- **Date bands.** One command drops a dashed "today" line across the whole canvas at the
  center of the screen. Bands keep their full width automatically.
- **Creation dates.** Every new card gets a small timestamp, shown on hover or always.
- **Projects.** A card belongs to the nearest root above it (a card with no incoming arrows).
  Each project gets a color stripe, and open branches get a project tag.
  `Project / Subsection` in a root's first line splits one project into several roots.
- **Open-branch counter.** The status bar shows how many leaf cards are still open
  against your comfort limit. Click it to highlight them.
- **Card menu.** Right-click a card or a selection: *Done ✅*, *Cancelled ❌*,
  *Pause project ⏸* and *Lay out under parent*. Pausing adds `⏸` to the project's roots,
  so it is visible in the canvas and undoable with Ctrl+Z.
- **Auto-layout.** When you drag a new card out of a parent, it is centered under it
  and all open branches line up in one row. Creation and layout undo in a single step.
- **Projects panel.** A side panel lists projects (in progress, paused, dormant)
  with a smooth jump to each project's latest card or any of its roots.

A card counts as done when it is green (color 4), starts with ❌, or its first line starts
with ✅ / ☑ / `~~` / `- [x]` and it has no unchecked `- [ ]`.

## Installation

Not in the community store yet. Manual install:

1. Download `main.js`, `manifest.json` and `styles.css` from the latest release.
2. Put them in `<vault>/.obsidian/plugins/worklog-timeline/`.
3. Enable **Worklog Timeline** in *Settings → Community plugins*.

## Languages

English and Russian. The plugin follows Obsidian's interface language.
To add a language, add a table to `STRINGS` at the top of `main.js` with the same keys.

## Notes

The plugin relies on undocumented parts of the Canvas API. Every call is guarded,
but a future Obsidian update may break some features.

## License

MIT
