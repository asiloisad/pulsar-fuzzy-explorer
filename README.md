# fuzzy-explorer

Fuzzy search files across user-defined directories.

## Features

- **Fast fuzzy search**: Uses algorithm with smart scoring.
- **Manual refresh**: Cache updates only when triggered by user.
- **[file-icons](https://github.com/file-icons/atom)**: Display file icons in the list.
- **[open-external](https://web.pulsar-edit.dev/packages/open-external)**: Open files with external applications.
- **[claude-chat](https://web.pulsar-edit.dev/packages/claude-chat)**: Attach file to Claude chat context.

## Installation

To install `fuzzy-explorer` search for [fuzzy-explorer](https://web.pulsar-edit.dev/packages/fuzzy-explorer) in the Install pane of the Pulsar settings or run `ppm install fuzzy-explorer`. Alternatively, you can run `ppm install asiloisad/pulsar-fuzzy-explorer` to install a package directly from the GitHub repository.

## Configuration

Create a config file at `~/.pulsar/explorer.cson` with an array of glob patterns:

```cson
[
  "C:/Projects/**"
  "D:/Work/src/*.ts"
  "E:/Documents/**/*.md"
]
```

## Commands

Commands available in `atom-workspace`:

- `fuzzy-explorer:toggle`: (`Ctrl+Alt+P`) toggle fuzzy explorer panel,
- `fuzzy-explorer:update`: refresh file cache,
- `fuzzy-explorer:edit`: open config file.

Commands available in `.fuzzy-explorer`:

- `select-list:open`: (`Enter`) open file,
- `select-list:open-externally`: (`Ctrl+Enter`) open file externally,
- `select-list:show-in-folder`: (`Alt+Enter`) show in folder,
- `select-list:split-left/right/up/down`: (`Alt+Left/Right/Up/Down`) open in split pane,
- `select-list:update`: (`F5`) refresh file index,
- `select-list:copy-r`: (`Alt+C`) copy relative path,
- `select-list:copy-a`: (`Alt+C Alt+A`) copy absolute path,
- `select-list:copy-n`: (`Alt+C Alt+N`) copy file name,
- `select-list:insert-r`: (`Alt+V`) insert relative path,
- `select-list:insert-a`: (`Alt+V Alt+A`) insert absolute path,
- `select-list:insert-n`: (`Alt+V Alt+N`) insert file name,
- `select-list:default-slash`: (`Alt+0`) use default separator,
- `select-list:forward-slash`: (`Alt+/`) use forward slash,
- `select-list:backslash`: (`Alt+\`) use backslash,
- `select-list:query-item`: (`Alt+Q`) set query from selected item path,
- `select-list:query-selection`: (`Alt+S`) set query from editor selection,
- `select-list:claude-chat`: (`Alt+F`) attach file to claude-chat.

## Contributing

Got ideas to make this package better, found a bug, or want to help add new features? Just drop your thoughts on GitHub — any feedback's welcome!
