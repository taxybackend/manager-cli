<div align="center">
  <h1>⚡ Manager-App-CLI</h1>
  <p><strong>An ultra-fast, interactive Process Manager with a GUI for Node.js, Python & Java.</strong></p>
  <br />
  <img src="https://i.imgur.com/KQryWIu.png" alt="Manager-App-CLI Dashboard" />
</div>

`manager-app-cli` is a powerful CLI tool that allows you to manage all your scripts and web applications in a beautiful, interactive terminal interface. Instead of dealing with complex pm2 commands, control everything via an intuitive dashboard!

## ✨ Features

- 🖥️ **Beautiful GUI:** Interactive terminal dashboard with status indicators (🟢 Online, 🔴 Error, 🟡 Starting).
- 🚀 **Auto-Detect:** Easily add projects with `/add index.js` – the CLI automatically detects whether it's Node, Next.js, Python, or Java.
- 📁 **Workspaces:** Group your projects into workspaces (e.g., "Backend", "Frontend") for maximum overview.
- 🔄 **Background Daemon:** All your processes continue to run 100% isolated and secure in a user-specific background daemon via Unix Sockets, even if you close the CLI.
- ⚡ **Autostart:** Mark important projects as "Startup" so they automatically boot up when the server starts.
- 📜 **Live Logs:** Stream logs in real-time directly in the CLI.
- 🤖 **Headless Mode:** Fully controllable via classic Bash commands (perfect for CI/CD scripts).

---

## 📦 Installation

Install the package globally via npm:

```bash
npm install -g manager-app-cli
```

---

## 🚀 Getting Started

Simply start the interactive dashboard by typing the name in your console:

```bash
manager-app-cli
```

### Adding a Project
You can add projects directly from the terminal or within the dashboard:

```bash
manager-app-cli add index.js -name "My Backend"
```

---

## 💻 Essential Commands (Headless / GUI)

You can enter all commands directly in the interactive menu starting with a `/`, or type them classically into the terminal:

| Command | Description |
|---------|-------------|
| `add <file>` | Adds a new project (Auto-detects JS/PY/Java) |
| `start <id/name>` | Starts a specific project |
| `stop <id/name>` | Stops a project |
| `restart <id/name>`| Restarts a project |
| `logs <id/name>` | Shows the live logs of the project |
| `delete <id/name>` | Deletes a project from the manager |
| `project <id> "Name"`| Moves a project into a new/existing workspace |
| `startup <id> on/off`| Toggles automatic autostart for this project |

*(Tip: Type `/help` in the GUI to browse through all commands!)*

---

## 🛠️ Advanced Features

### Workspaces
Keep your system tidy. You can use the **[TAB]** key to switch between different workspaces (folders) in the GUI at any time.

### User Isolation
The background daemon runs extremely securely via a Unix Domain Socket (`~/.manager-cli/data.sock`). Every Linux user on your server has their own completely isolated Manager Daemon.

### Error Detection
The system automatically scans the output of your scripts. If a crash or severe error occurs, the status indicator changes to `🔴 ERROR`, so you can instantly see which project is having issues.

---

## 🌍 Multilingual
The CLI is bilingual! Type `/lang de` or `/lang en` in the dashboard to switch between German and English.

---

<div align="center">
  <i>Built for developers who value aesthetics and efficiency.</i>
</div>
