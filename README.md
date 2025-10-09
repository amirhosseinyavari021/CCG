# AY-CMDGEN - Your Intelligent Command-Line Assistant

[![License: MIT](https://img.shields.io/badge/License-MIT-00d4aa)](https://opensource.org/licenses/MIT)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-3498db)](https://www.apache.org/licenses/LICENSE-2.0)
[![Version](https://img.shields.io/badge/Release-v2.7.1-8a2be2)](https://github.com/amirhosseinyavari021/ay-cmdgen/releases)
[![Website](https://img.shields.io/badge/Live_Demo-HERE-FFD700)](https://cmdgen.onrender.com)
[![Libraries.io](https://img.shields.io/badge/Listed_on-Libraries.io-4a6fa5)]([https://libraries.io/npm/@amirhosseinyavari/ay-cmdgen](https://libraries.io/npm/@amirhosseinyavari%2Fay-cmdgen))
[![npm](https://img.shields.io/badge/Published_on-npm-dd1100)](https://www.npmjs.com/package/@amirhosseinyavari/ay-cmdgen)

Generate, analyze, script, and debug command-line instructions with an AI-powered assistant, right in your terminal.

CMDGEN is a smart, cross-platform tool that bridges the gap between natural language and the command line. Whether you're a seasoned sysadmin, a developer, or a network engineer, CMDGEN helps you master the terminal with ease. This project features both a powerful Command-Line Tool (CLI) and a user-friendly Web Application.

🎉 **What's New in Version 2.7.1 – Intelligent, Context-Aware, and Stable**

This version represents a complete overhaul of AY-CMDGEN, focusing on new intelligent features, critical bug fixes, and a dramatic increase in the quality of AI-generated output. The tool is now more context-aware, stable, and valuable for users of all skill levels.

**1. Major Feature Enhancements**

  - 🧠 **Full Cisco Support**: CMDGEN is now a powerful tool for network engineers. Select **Cisco** as a platform in both the web and CLI versions to generate, script, analyze, and debug commands.
  - **Device-Specific Context**: When Cisco is selected, the tool asks for the **Device Type** (Router, Switch, Firewall) to provide highly accurate and relevant commands.
  - 🎓 **Contextual Intelligence via Knowledge Level**: A new **Knowledge Level** (Beginner, Intermediate, Expert) parameter has been integrated into all commands. The AI now strictly tailors its responses to your expertise, providing simple, explanatory commands for beginners and concise, advanced commands for experts.

**2. Critical Bug Fixes and Stability Improvements**

  - ✔️ **`generate` Command Overhaul**: Fixed a critical bug that caused crashes on complex requests and returned duplicate commands. The AI now provides functionally different suggestions and suggests the `script` command for multi-line tasks.
  - ✔️ **Command Execution Fixed**: Commands containing Markdown (e.g., `**cat file**`) now execute correctly, as all formatting is stripped before execution.
  - ✔️ **`history` Command Restored**: The command history is now saved reliably after every successful generation.
  - ✔️ **Windows `update` Command Fixed**: The update command now uses the more reliable `Invoke-WebRequest` cmdlet, ensuring compatibility across Windows systems.

**3. General Quality Enhancements**

  - ✨ **AI Prompt Overhaul**: All prompts sent to the AI have been meticulously rewritten to enforce stricter output formats and demand higher-quality, educational, and practical responses.
  - 💪 **Robust Parser**: The response parser is now more resilient and can handle minor inconsistencies in AI output, preventing crashes.
  - ⚙️ **Node.js Version**: `package.json` now requires Node.js `>=20.x` to prevent installation warnings.
  - 🐞 **Initial Syntax Errors Resolved**: All known syntax bugs have been fixed, making the tool fully operational.

✨ **Key Features**

  - **AI-Powered Generation**: Describe what you want to do and get the exact command you need, tailored to your **OS**, **Device Type**, and **Knowledge Level**.
  - **Intelligent Scripting**: Turn multi-step tasks into ready-to-run scripts for PowerShell, Bash, and **Cisco CLI**.
  - **In-depth Analysis**: Paste any command to get a detailed explanation customized to your level of expertise.
  - **Error Debugging**: Got an error? CMDGEN analyzes it and gives you a step-by-step solution.
  - **Cross-Platform Support**: Natively works on Windows, macOS, Linux, and now **Cisco**.
  - **Multi-Language Support**: Available in both **English** and **Persian (فارسی)**.
  - **Interactive Mode**: Directly execute generated commands, request more suggestions, or exit effortlessly.
  - **Configuration Management**: Easily manage your default settings (OS, shell, language, knowledge level) with the `config` command.
  - **Self-Update Mechanism**: Keep your tool up-to-date with a simple `update` command.

🚀 **Quick Install (Recommended)**

The installation script automatically detects your OS, downloads the correct version, and sets it up for you.

⚠️ **Administrator Privileges Required**
CMDGEN requires administrator/root privileges for global installation to write files into system directories (e.g., `/usr/local/bin`).

### **How to Install**

**For macOS / Linux:**

  - Using NPM (recommended for Node.js users):
    ```bash
    sudo npm install -g @amirhosseinyavari/ay-cmdgen
    ```
  - Using the installation script (requires sudo):
    ```bash
    curl -fsSL https://raw.githubusercontent.com/amirhosseinyavari021/ay-cmdgen/main/install.sh | sudo bash
    ```

**For Windows:**

  - Open PowerShell as Administrator.
  - Install via NPM:
    ```powershell
    npm install -g @amirhosseinyavari/ay-cmdgen
    ```
  - Or using the installation script:
    ```powershell
    Invoke-WebRequest -Uri https://raw.githubusercontent.com/amirhosseinyavari021/ay-cmdgen/main/install.ps1 -UseBasicParsing | Invoke-Expression
    ```

✅ **Tip for Users Without Admin Rights**
Use `npx` to run CMDGEN without a global installation:

```bash
npx @amirhosseinyavari/ay-cmdgen generate "list all files"
```

After installation, open a new terminal window and verify by running: `cmdgen`

-----

🛡️ **Security & Platform-Specific Warnings**

CMDGEN is a **100% open-source, safe, and trusted tool** dual-licensed under **MIT and Apache 2.0**. Your OS may show a security warning for unsigned open-source tools; this is normal. Click "More info" → "Run anyway" on Windows or go to "System Settings → Privacy & Security" → "Open Anyway" on macOS.

🔒 **Why CMDGEN is Safe & Trusted**

CMDGEN is built with **transparency, privacy, and user control** at its core.

  - **100% Open Source**: All code is publicly available on [GitHub](https://github.com/amirhosseinyavari021/ay-cmdgen).
  - **No Spyware or Telemetry**: Your commands and system details are **never sent to any server**.
  - **All Data Stays on Your Machine**: History and settings are stored locally.
  - **Transparent AI Integration**: Uses a trusted, open gateway to AI models without exposing API keys.
  - **No Dangerous Permissions**: Never accesses your files, camera, or mic.
  - **Secure Installation**: Downloads directly from official GitHub Releases.

-----

⚙️ **How to Use**

**Command Summary**

| Command | Alias | Description |
|---|---|---|
| `generate <request>` | `g` | Generate a single command |
| `script <request>` | `s` | Generate a full script |
| `analyze <command>` | `a` | Understand what a command does |
| `error <message>` | `e` | Help with an error message |
| `history` | `h` | Show recently generated commands |
| `config [action]` | | Manage saved settings (show, set, wizard) |
| `update` | | Update cmdgen to the latest version |

**1. First-Time Setup**
Run any command (e.g., `cmdgen g "list files"`) to launch the setup wizard. You can configure your default OS, shell, language, and knowledge level.

**2. Generate Commands (g)**
Stuck? Just ask.

```bash
# Get a simple Cisco command for a beginner
cmdgen g "show interface status" --os cisco --device switch --level beginner

# Get an advanced command to find large files on Linux for an expert
cmdgen g "find all files larger than 1GB" --os linux --level expert
```

**3. Create Scripts (s)**
Automate complex tasks instantly.

```bash
# Create a robust Cisco script to configure OSPF on a router
cmdgen s "configure ospf with process id 1 and advertise 192.168.1.0/24 for area 0" --level intermediate

# Create a Bash script to back up a directory
cmdgen s "create a backup of /etc/nginx"
```

**4. Analyze a Command (a)**
Understand what a command does before you run it.

```bash
# Analyze a Cisco ACL command for a beginner
cmdgen a "access-list 101 permit tcp any any eq 80" --level beginner
```

**5. Debug an Error (e)**
Turn confusing error messages into clear solutions.

```bash
# Figure out a common Cisco error
cmdgen e "% Incomplete command."

# Get help with a "command not found" error on Linux
cmdgen e "bash: docker: command not found"
```

💻 **Web Version**
Prefer a graphical interface? Use the web version instantly without any installation.
→ [https://cmdgen.onrender.com](https://cmdgen.onrender.com)

The web version includes full support for all features, including the new Cisco and Knowledge Level capabilities.

-----

## 🧑‍💻 About the Creator

I'm **Amirhossein Yavari**, born in 2008, an IT enthusiast passionate about building helpful tools that simplify complex tasks. CMDGEN is one of my personal projects designed to bridge the gap between natural language and the command line — making terminal usage faster, safer, and more accessible for everyone.

-----

## ❓ Frequently Asked Questions (FAQ)

**Q1: Is AY-CMDGEN safe and private?**
Yes. CMDGEN is **100% open-source**, **telemetry-free**, and **privacy-first**. Your commands, file paths, and system details are **never sent to any server** (in CLI mode), and the web version does **not store your prompts**.

**Q2: Can I use AY-CMDGEN without installing it?**
Absolutely\! Visit the **web version** at [https://cmdgen.onrender.com](https://cmdgen.onrender.com) to use all core features instantly—no installation required.

**Q3: How do I use the new Cisco support?**
In the CLI, use the `--os cisco` and `--device <type>` flags:

```bash
cmdgen generate "show all interfaces status" --os cisco --device switch
```

In the web app, select **Cisco** from the "Platform / OS" dropdown menu and then choose your device type (Router, Switch, or Firewall).

**Q4: How does the Knowledge Level feature work?**
Specify your expertise (`beginner`, `intermediate`, or `expert`) using the `--level` flag in the CLI or the dropdown in the web app. The AI will adjust the complexity, explanation, and style of its response accordingly.

**Q5: Does AY-CMDGEN work on Windows, macOS, and Linux?**
Yes\! CMDGEN is **cross-platform** and supports Windows (PowerShell, CMD), macOS (Bash, Zsh), Linux (Bash, Zsh), and now **Cisco** (CLI).

-----

📜 **License**
This project is dual-licensed under the MIT License and the Apache License 2.0. See the LICENSE file for details.
