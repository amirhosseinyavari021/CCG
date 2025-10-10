# CCG (Cando Command Generator) - Your Intelligent Command-Line Assistant

[![Hosted by Cando Academy](https://img.shields.io/badge/Hosted%20by-Cando%20Academy-yellow)](https://cando.ac)
[![License: MIT](https://img.shields.io/badge/License-MIT-00d4aa)](https://opensource.org/licenses/MIT)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-3498db)](https://www.apache.org/licenses/LICENSE-2.0)
[![Version](https://img.shields.io/badge/Release-v2.7.3-8a2be2)](https://github.com/amirhosseinyavari021/CCG/releases)
[![Website](https://img.shields.io/badge/Live_Demo-HERE-FFD700)](https://cmdgen.onrender.com)
[![npm](https://img.shields.io/badge/Published_on-npm-dd1100)](https://www.npmjs.com/package/@amirhosseinyavari/ay-cmdgen)

**A Cando Academy Service, created and executed by Amirhossein Yavari.**

Generate, analyze, script, and debug command-line instructions with an AI-powered assistant, right in your terminal.

CCG is a smart, cross-platform tool that bridges the gap between natural language and the command line. Whether you're a seasoned sysadmin, a developer, or a network engineer, CCG helps you master the terminal with ease. This project features both a powerful Command-Line Tool (CLI) and a user-friendly Web Application.

🎉 **What's New in Version 2.7.3 – Cando Rebranding & UI Enhancements**

This version officially rebrands the tool to CCG (Cando Command Generator) and introduces significant UI/UX improvements.

-   **Official Cando Branding**: The entire application (Web and CLI) has been rebranded to align with Cando Academy.
-   **New Color Scheme**: The web UI now features a new yellow-and-black theme, reflecting the Cando visual identity.
-   **Updated CLI Banner**: The CLI welcome banner has been updated with a new ASCII logo and attribution to Cando.
-   **Updated Repository Links**: All installation and update links now point to the new official repository: `github.com/amirhosseinyavari021/CCG`.

✨ **Key Features**

-   **AI-Powered Generation**: Describe what you want to do and get the exact command you need, tailored to your **OS**, **Device Type**, and **Knowledge Level**.
-   **Intelligent Scripting**: Turn multi-step tasks into ready-to-run scripts for PowerShell, Bash, and **Cisco CLI**.
-   **In-depth Analysis**: Paste any command to get a detailed explanation customized to your level of expertise.
-   **Error Debugging**: Got an error? CCG analyzes it and gives you a step-by-step solution.
-   **Cross-Platform Support**: Natively works on Windows, macOS, Linux, and now **Cisco**.
-   **Multi-Language Support**: Available in both **English** and **Persian (فارسی)**.
-   **Interactive Mode**: Directly execute generated commands, request more suggestions, or exit effortlessly.
-   **Configuration Management**: Easily manage your default settings (OS, shell, language, knowledge level) with the `config` command.
-   **Self-Update Mechanism**: Keep your tool up-to-date with a simple `update` command.

🚀 **Quick Install (Recommended)**

The installation script automatically detects your OS, downloads the correct version, and sets it up for you.

⚠️ **Administrator Privileges Required**
CCG requires administrator/root privileges for global installation to write files into system directories (e.g., `/usr/local/bin`).

### **How to Install**

**For macOS / Linux:**

-   Using NPM (recommended for Node.js users):
    ```bash
    sudo npm install -g @amirhosseinyavari/ay-cmdgen
    ```
-   Using the installation script (requires sudo):
    ```bash
    curl -fsSL [https://raw.githubusercontent.com/amirhosseinyavari021/CCG/main/install.sh](https://raw.githubusercontent.com/amirhosseinyavari021/CCG/main/install.sh) | sudo bash
    ```

**For Windows:**

-   Open PowerShell as Administrator.
-   Install via NPM:
    ```powershell
    npm install -g @amirhosseinyavari/ay-cmdgen
    ```
-   Or using the installation script:
    ```powershell
    Invoke-WebRequest -Uri [https://raw.githubusercontent.com/amirhosseinyavari021/CCG/main/install.ps1](https://raw.githubusercontent.com/amirhosseinyavari021/CCG/main/install.ps1) -UseBasicParsing | Invoke-Expression
    ```

✅ **Tip for Users Without Admin Rights**
Use `npx` to run CCG without a global installation:

```bash
npx @amirhosseinyavari/ay-cmdgen generate "list all files"
````

After installation, open a new terminal window and verify by running: `cmdgen`

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

**1. Generate Commands (g)**
Stuck? Just ask.

```bash
# Get a simple Cisco command for a beginner
cmdgen g "show interface status" --os cisco --device switch --level beginner

# Get an advanced command to find large files on Linux for an expert
cmdgen g "find all files larger than 1GB" --os linux --level expert
```

**2. Create Scripts (s)**
Automate complex tasks instantly.

```bash
# Create a robust Cisco script to configure OSPF on a router
cmdgen s "configure ospf with process id 1 and advertise 192.168.1.0/24 for area 0" --level intermediate

# Create a Bash script to back up a directory
cmdgen s "create a backup of /etc/nginx"
```

💻 **Web Version**
Prefer a graphical interface? Use the web version instantly without any installation.
→ [https://cmdgen.onrender.com](https://cmdgen.onrender.com)

The web version includes full support for all features, including the new Cisco and Knowledge Level capabilities.

-----

## 🧑‍💻 About the Creator

I'm **Amirhossein Yavari**, an IT enthusiast passionate about building helpful tools that simplify complex tasks. CCG is one of my personal projects designed to bridge the gap between natural language and the command line — making terminal usage faster, safer, and more accessible for everyone. This project is now proudly part of the Cando Academy toolkit.

-----

## ❓ Frequently Asked Questions (FAQ)

**Q1: Is CCG safe and private?**
Yes. CCG is **100% open-source**, **telemetry-free**, and **privacy-first**. Your commands, file paths, and system details are **never sent to any server** (in CLI mode), and the web version does **not store your prompts**.

**Q2: Can I use CCG without installing it?**
Absolutely\! Visit the **web version** at [https://cmdgen.onrender.com](https://cmdgen.onrender.com) to use all core features instantly—no installation required.

**Q3: How do I use the new Cisco support?**
In the CLI, use the `--os cisco` and `--device <type>` flags. In the web app, select **Cisco** from the "Platform / OS" dropdown menu and then choose your device type (Router, Switch, or Firewall).

**Q4: How does the Knowledge Level feature work?**
Specify your expertise (`beginner`, `intermediate`, or `expert`) using the `--level` flag in the CLI or the dropdown in the web app. The AI will adjust the complexity, explanation, and style of its response accordingly.

**Q5: Does CCG work on Windows, macOS, and Linux?**
Yes\! CCG is **cross-platform** and supports Windows (PowerShell, CMD), macOS (Bash, Zsh), Linux (Bash, Zsh), and now **Cisco** (CLI).

-----

📜 **License**
This project is dual-licensed under the MIT License and the Apache License 2.0. See the LICENSE file for details.

```
```
