const { CompositeDisposable, Disposable, File, Task } = require("atom");
const {
  SelectListView,
  createTwoLineItem,
  highlightMatches,
} = require("pulsar-select-list");
const { shell, clipboard } = require("electron");
const path = require("path");
const fs = require("fs");
const CSON = require("cson");
const defaultIconClass = require("./icon");

let iconClassForPath = null;
let openExternalService = null;
let claudeChatService = null;

module.exports = {
  items: [],
  pending: true,
  building: false,
  separator: 0,
  selectList: null,
  disposables: null,
  cacheWatcher: null,

  activate() {
    this.cacheWatcher = new Disposable();

    this.selectList = new SelectListView({
      className: "fuzzy-explorer",
      items: [],
      maxResults: 50,
      emptyMessage: "No matches found",
      removeDiacritics: true,
      algorithm: "command-t",
      loadingSpinner: true,
      elementForItem: (item, options) => this.elementForItem(item, options),
      didConfirmSelection: () => this.performAction("open"),
      didCancelSelection: () => this.selectList.hide(),
      willShow: () => this.onWillShow(),
    });

    this.disposables = new CompositeDisposable(
      atom.config.observe("fuzzy-explorer.separator", (value) => {
        this.separator = value;
      }),
      atom.commands.add("atom-workspace", {
        "fuzzy-explorer:toggle":
          () => this.selectList.toggle(),
        "fuzzy-explorer:update":
          () => this.build(),
        "fuzzy-explorer:edit":
          () => this.editConfig(),
      }),
      atom.commands.add(this.selectList.element, {
        "select-list:query-item":
          () => this.updateQueryFromItem(),
        "select-list:open":
          () => this.performAction("open"),
        "select-list:open-externally": () =>
          this.performAction("open-externally"),
        "select-list:show-in-folder": () =>
          this.performAction("show-in-folder"),
        "select-list:split-left": () =>
          this.performAction("split", { side: "left" }),
        "select-list:split-right": () =>
          this.performAction("split", { side: "right" }),
        "select-list:split-up": () =>
          this.performAction("split", { side: "up" }),
        "select-list:split-down": () =>
          this.performAction("split", { side: "down" }),
        "select-list:insert-a": () =>
          this.performAction("path", { op: "insert", rel: "a" }),
        "select-list:insert-r": () =>
          this.performAction("path", { op: "insert", rel: "r" }),
        "select-list:insert-n": () =>
          this.performAction("path", { op: "insert", rel: "n" }),
        "select-list:copy-a": () =>
          this.performAction("path", { op: "copy", rel: "a" }),
        "select-list:copy-r": () =>
          this.performAction("path", { op: "copy", rel: "r" }),
        "select-list:copy-n": () =>
          this.performAction("path", { op: "copy", rel: "n" }),
        "select-list:update":
          () => this.update(),
        "select-list:claude-chat":
          () => this.performAction("claude-chat"),
        "select-list:query-selection": () =>
          this.selectList.setQueryFromSelection(),
        "select-list:default-slash": () => {
          atom.config.set("fuzzy-explorer.separator", 0);
          atom.notifications.addSuccess(
            "Separator has been changed to default"
          );
        },
        "select-list:forward-slash": () => {
          atom.config.set("fuzzy-explorer.separator", 1);
          atom.notifications.addSuccess(
            "Separator has been changed to forward slash"
          );
        },
        "select-list:backslash": () => {
          atom.config.set("fuzzy-explorer.separator", 2);
          atom.notifications.addSuccess(
            "Separator has been changed to backslash"
          );
        },
      })
    );

    this.observeCache();
    this.loadCache();
  },

  deactivate() {
    this.cacheWatcher.dispose();
    this.disposables.dispose();
    this.selectList.destroy();
  },

  getConfigPath() {
    return path.join(atom.getConfigDirPath(), "explorer.cson");
  },

  getCachePath() {
    return path.join(atom.getConfigDirPath(), "compile-cache", "explorer.json");
  },

  observeCache() {
    const cacheFile = new File(this.getCachePath());
    this.cacheWatcher = cacheFile.onDidChange(() => {
      this.loadCache();
      this.pending = true;
      if (this.selectList.isVisible()) {
        this.selectList.update({
          items: this.items,
          loadingMessage: null,
          helpMarkdown: this.getHelpMarkdown(),
        });
      }
    });
  },

  editConfig() {
    const configPath = this.getConfigPath();
    if (!fs.existsSync(configPath)) {
      fs.writeFileSync(
        configPath,
        '[\n  # Add glob patterns here\n  # "C:/Projects/**/*.js"\n]\n'
      );
    }
    atom.workspace.open(configPath);
  },

  loadConfig() {
    const configPath = this.getConfigPath();
    if (!fs.existsSync(configPath)) return [];
    try {
      const content = fs.readFileSync(configPath, "utf8");
      const patterns = CSON.parse(content);
      if (!Array.isArray(patterns)) return [];
      return patterns.filter((p) => typeof p === "string" && p.length > 0);
    } catch {
      return [];
    }
  },

  loadCache() {
    const cachePath = this.getCachePath();
    if (!fs.existsSync(cachePath)) return false;
    try {
      const content = fs.readFileSync(cachePath, "utf8");
      this.items = JSON.parse(content);
      return true;
    } catch {
      return false;
    }
  },

  saveCache() {
    const cachePath = this.getCachePath();
    const cacheDir = path.dirname(cachePath);
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    fs.writeFileSync(cachePath, JSON.stringify(this.items));
  },

  build() {
    if (this.building) return;
    this.building = true;
    const patterns = this.loadConfig();
    const itemSet = new Set();
    if (patterns.length === 0) {
      this.items = [];
      this.saveCache();
      this.building = false;
      return;
    }
    Promise.all(patterns.map((pattern) => this.globPromise(pattern, itemSet))).then(
      () => {
        this.items = [...itemSet];
        this.saveCache();
        this.building = false;
      }
    );
  },

  globPromise(pattern, itemSet) {
    return new Promise((resolve) => {
      const taskPath = require.resolve("./scan");
      const task = Task.once(taskPath, pattern);
      task.on("entries", (entries) => {
        for (const filePath of entries) {
          itemSet.add(path.normalize(filePath));
        }
        resolve();
      });
    });
  },

  onWillShow() {
    if (this.pending) {
      this.pending = false;
      this.selectList.update({
        items: this.items,
        helpMarkdown: this.getHelpMarkdown(),
      });
    }
  },

  getHelpMarkdown() {
    return (
      "Available commands:\n" +
      "- **Enter** — Open file\n" +
      "- **Ctrl+Enter** — Open externally\n" +
      "- **Alt+Enter** — Show in folder\n" +
      "- **Alt+Left|Right|Up|Down** — Split pane\n" +
      "- **Alt+C A|R|N** — Copy path\n" +
      "- **Alt+V A|R|N** — Insert path\n" +
      "- **Alt+Q** — Query from item\n" +
      "- **Alt+S** — Query from selection\n" +
      "- **Alt+0|/|\\\\** — Set separator\n" +
      "- **Alt+F** — Attach to claude-chat\n\n" +
      `**${this.items.length}** files indexed`
    );
  },

  elementForItem(item, { matchIndices }) {
    return createTwoLineItem({
      primary: highlightMatches(item, matchIndices || []),
      icon: this.iconClassForPath(item),
    });
  },

  update() {
    this.selectList.update({
      loadingMessage: "Indexing files\u2026",
    });
    this.build();
  },

  updateQueryFromItem() {
    const item = this.selectList.getSelectedItem();
    const text = path.dirname(item) + path.sep;
    this.selectList.refs.queryEditor.setText(text);
    this.selectList.refs.queryEditor.moveToEndOfLine();
  },

  performAction(mode, params) {
    const item = this.selectList.getSelectedItem();
    if (!item) return;

    let editor, itemPath, text;

    if (mode === "open") {
      itemPath = item;
      try {
        if (!fs.lstatSync(itemPath).isFile()) {
          return this.updateQueryFromItem();
        }
      } catch (error) {
        atom.notifications.addError(error.message || String(error), {
          detail: itemPath,
        });
      }
    }

    this.selectList.hide();

    if (mode === "open") {
      atom.workspace.open(item);
    } else if (mode === "open-externally") {
      if (openExternalService) {
        openExternalService.openExternal(item);
      } else {
        shell.openPath(item);
      }
    } else if (mode === "show-in-folder") {
      if (openExternalService) {
        openExternalService.showInFolder(item);
      } else {
        shell.showItemInFolder(item);
      }
    } else if (mode === "split") {
      itemPath = item;
      try {
        if (fs.lstatSync(itemPath).isFile()) {
          atom.workspace.open(itemPath, { split: params.side });
        } else {
          atom.notifications.addError("Cannot open path, because it's a dir", {
            detail: itemPath,
          });
        }
      } catch (error) {
        atom.notifications.addError(error.message || String(error), {
          detail: itemPath,
        });
      }
    } else if (mode === "path") {
      if (params.rel === "a") {
        text = item;
      } else if (params.rel === "r") {
        editor = atom.workspace.getActiveTextEditor();
        if (!editor) {
          atom.notifications.addError(
            "Cannot insert path, because there is no active text editor"
          );
          return;
        }
        const editorPath = editor.getPath();
        text = editorPath
          ? path.relative(path.dirname(editorPath), item)
          : item;
      } else if (params.rel === "n") {
        text = path.basename(item);
      }
      if (this.separator === 1) {
        text = text.replace(/\\/g, "/");
      } else if (this.separator === 2) {
        text = text.replace(/\//g, "\\");
      }
      if (params.op === "insert") {
        if (!editor) editor = atom.workspace.getActiveTextEditor();
        if (!editor) {
          atom.notifications.addError(
            "Cannot insert path, because there is no active text editor"
          );
          return;
        }
        editor.insertText(text, { select: true });
      } else if (params.op === "copy") {
        clipboard.writeText(text);
      }
    } else if (mode === "claude-chat") {
      if (!claudeChatService) {
        atom.notifications.addWarning("claude-chat service not available");
        return;
      }
      const context = {
        type: "paths",
        paths: [item],
        label: item,
        icon: "file",
      };
      if (!claudeChatService.setFocusContext(context)) {
        atom.notifications.addWarning("No active claude-chat panel");
      }
    }
  },

  iconClassForPath(filePath) {
    if (iconClassForPath) {
      return iconClassForPath(filePath);
    } else {
      return defaultIconClass(filePath);
    }
  },

  consumeClassIcons(object) {
    iconClassForPath = object.iconClassForPath;
  },

  consumeOpenExternalService(service) {
    openExternalService = service;
    return new Disposable(() => {
      openExternalService = null;
    });
  },

  consumeClaudeChat(service) {
    claudeChatService = service;
    return new Disposable(() => {
      claudeChatService = null;
    });
  },
};
