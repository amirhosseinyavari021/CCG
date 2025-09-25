# CMDGEN - Your Intelligent Command-Line Assistant
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://www.apache.org/licenses/LICENSE-2.0)

CMDGEN is an AI-powered, cross-platform command-line assistant that lets you generate, analyze, script, and debug shell commands in natural language. Whether you're a system administrator, developer, or just learning, CMDGEN helps you master the terminal with ease — right from your terminal or via the web.

---

## 🚀 Quick Start

### 1. **Requirements**
- [Node.js (LTS)](https://nodejs.org/) & npm must be installed.

### 2. **Global Installation (recommended)**
> **You usually need admin/sudo privileges for global install!**
- **Linux/macOS:**  
  ```bash
  sudo npm install -g @amirhosseinyavari/ay-cmdgen
  ```
- **Windows:**  
  Open **Command Prompt** or **PowerShell** as Administrator:
  ```powershell
  npm install -g @amirhosseinyavari/ay-cmdgen
  ```

### 3. **Without Admin (Temporary Use)**
You can always run CMDGEN on demand with npx (no install, no admin required):
```bash
npx @amirhosseinyavari/ay-cmdgen g "list files"
```
But you must use the full command each time.

---

## ✨ What Can CMDGEN Do?

- **Generate Commands:** Describe what you want in plain English, get the exact shell command.
- **Script Generation:** Turn complex tasks into ready-to-run scripts — Bash, PowerShell, and more.
- **Command Analysis:** Paste any command and get a plain-language explanation of what it does.
- **Error Debugging:** Paste any error message, get step-by-step troubleshooting help.
- **Command History:** See your last 20 generated commands and scripts.
- **Update Notification:** CMDGEN auto-checks for new versions and notifies you on every run.
- **Self-Update:** Instantly update with `cmdgen update`.
- **Configurable:** Set or inspect default OS/shell for more accurate suggestions.
- **Multi-language:** Supports English and Persian.
- **Feedback System:** Give feedback with `cmdgen feedback` or via auto-prompt.
- **Smart Uninstall:** Remove everything and optionally tell us why with `cmdgen delete`.
- **Works Everywhere:** Windows, Linux, macOS, CLI and web.

---

## ⚙️ Usage Overview

After installation, open a new terminal and run:
```bash
cmdgen
```
The first time you use CMDGEN, a setup wizard asks about your OS and preferred shell.

**Main Commands:**

| Command                     | Alias | Description                                      |
|-----------------------------|-------|--------------------------------------------------|
| `generate <request>`        | `g`   | Generate a single command                        |
| `script <request>`          | `s`   | Generate a full script                           |
| `analyze <command>`         | `a`   | Explain what a command does                      |
| `error <message>`           | `e`   | Get help for an error message                    |
| `history`                   |       | Show recently generated commands/scripts         |
| `feedback`                  | `f`   | Provide feedback on the tool                     |
| `config [action]`           |       | Show/set config, or run setup wizard             |
| `update`                    |       | Update CMDGEN to the latest version              |
| `delete`                    | `d`   | Uninstall CMDGEN and all configs                 |

**Examples:**
```bash
cmdgen g "list all files larger than 1GB in /home"
cmdgen s "backup /etc/nginx to /backups/nginx-backup.tar.gz"
cmdgen a "docker run -it alpine"
cmdgen e "zsh: command not found: xyz"
cmdgen history
cmdgen config show
cmdgen feedback
cmdgen update
cmdgen delete
```

---

## 🌐 Web Version

You can also try CMDGEN online, with a visual interface:  
[https://cmdgen.onrender.com](https://cmdgen.onrender.com)

---

## 📝 FAQ

### **Q: Do I need Node.js and npm?**
**A:** Yes, CMDGEN is built for Node.js and distributed via npm.  
Download from [nodejs.org](https://nodejs.org/).

---

### **Q: Why does global install need admin/sudo?**
**A:** Because global npm installs write to system folders (`/usr/local/bin`, `C:\Program Files\...`).  
If you don't have admin, use `npx` for temporary runs.

---

### **Q: CMDGEN says a new version is available. How do I update?**
**A:** Just run:
```bash
cmdgen update
```
Or manually:
```bash
npm install -g @amirhosseinyavari/ay-cmdgen
```

---

### **Q: After install, `cmdgen` is not found!**
**A:** Try these:
- Open a new terminal window.
- Make sure npm global bin path is in your PATH.
- Try reinstalling as admin/sudo.

---

### **Q: How do I uninstall CMDGEN completely?**
**A:** Run:
```bash
cmdgen delete
```
You'll be asked for confirmation and (optionally) feedback.

---

### **Q: Is my data tracked?**
**A:** No personal data is collected. CMDGEN only counts basic anonymous stats (user count, usage events).

---

### **Q: Can I change the default OS or shell?**
**A:** Yes!  
Run the setup wizard:
```bash
cmdgen config wizard
```
Or set manually:
```bash
cmdgen config set os linux
cmdgen config set shell bash
```

---

### **Q: Can I use CMDGEN in Persian?**
**A:** Yes! CMDGEN supports Persian and English.

---

### **Q: How do I give feedback or report bugs?**
**A:** Use:
```bash
cmdgen feedback
```
Or open an issue on GitHub.

---

## 👨‍💻 For Developers

1.  **Clone this repo:** `git clone https://github.com/amirhosseinyavari021/ay-cmdgen.git`
2.  **Install dependencies:** `cd ay-cmdgen && npm install`
3.  **Build all executables:** `npm run release`

---

## ⚙️ Configuration

Settings saved in `~/.cmdgen/config.json`.  
You can edit this for advanced customization (default OS, shell, etc).

---

## 🤝 Contributing

Pull requests and feedback are always welcome!

---

## 📜 License

Dual licensed under [MIT](https://opensource.org/licenses/MIT) and [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0).
