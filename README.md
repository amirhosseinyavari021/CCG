# CCG (Cando Command Generator) - Your Intelligent Command-Line Assistant

[![Hosted by Cando Academy](https://img.shields.io/badge/Hosted%20by-Cando%20Academy-yellow)](https://cando.ac)
[![License: MIT](https://img.shields.io/badge/License-MIT-00d4aa)](https://opensource.org/licenses/MIT)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-3498db)](https://www.apache.org/licenses/LICENSE-2.0)
[![Version](https://img.shields.io/badge/Release-v3.0.3-8a2be2)](https://github.com/amirhosseinyavari021/CCG/releases)
[![Website](https://img.shields.io/badge/Web-app-HERE-FFD700)](https://ccg.cando.ac)
[![npm](https://img.shields.io/badge/Published_on-npm-dd1100)](https://www.npmjs.com/package/@amirhosseinyavari/ccg)


🎉 **What's New in Version 2.7.6 – CI/CD Pipeline & Release Asset Fixes**

This release focuses on correcting the automated deployment pipeline to ensure release assets are properly uploaded.

  - **GitHub Actions Fix**: Corrected the release workflow to successfully build and attach all compiled binaries (`ccg-linux`, `ccg-macos`, `ccg-win.exe`) to new releases.
  - **Previous Enhancements (from v2.7.5)**: This version solidifies the official rebranding to `CCG`, includes the robust NPM-based updater, and incorporates critical fixes for the web client build and input validation.

✨ **Key Features**

  - **AI-Powered Generation**: Describe what you want to do and get the exact command you need, tailored to your **OS**, **Device Type**, and **Knowledge Level**.
  - **Intelligent Scripting**: Turn multi-step tasks into ready-to-run scripts for PowerShell, Bash, and **Cisco CLI**.
  - **In-depth Analysis**: Paste any command to get a detailed explanation customized to your level of expertise.
  - **Error Debugging**: Got an error? CCG analyzes it and gives you a step-by-step solution.
  - **Cross-Platform Support**: Natively works on Windows, macOS, Linux, and now **Cisco**.
  - **Multi-Language Support**: Available in both **English** and **Persian (فارسی)**.
  - **Interactive Mode**: Directly execute generated commands, request more suggestions, or exit effortlessly.
  - **Configuration Management**: Easily manage your default settings (OS, shell, language, knowledge level) with the `config` command.
  - **Self-Update Mechanism**: Keep your tool up-to-date with a simple `ccg update` command.

🚀 **Quick Install (Recommended)**

**Administrator Privileges are typically required for global installation.**

### **For macOS / Linux**

The recommended way to install and update is with NPM:

```bash
sudo npm install -g @amirhosseinyavari/ay-cmdgen
```

*To update, simply run the same command again.*

### **For Windows**

Open PowerShell as **Administrator** and run:

```powershell
npm install -g @amirhosseinyavari/ay-cmdgen
```

*To update, simply run the same command again.*

✅ **Tip for Users Without Admin Rights**
You can use `npx` to run CCG without a global installation:

```bash
npx @amirhosseinyavari/ay-cmdgen generate "list all files"
```

After installation, open a **new terminal window** and verify by running: `ccg --help`

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
| `update` | | Update CCG to the latest version |

**1. Generate Commands (g)**
Stuck? Just ask.

```bash
# Get a simple Cisco command for a beginner
ccg g "show interface status" --os cisco --device switch --level beginner

# Get an advanced command to find large files on Linux for an expert
ccg g "find all files larger than 1GB" --os linux --level expert
```

**2. Create Scripts (s)**
Automate complex tasks instantly.

```bash
# Create a robust Cisco script to configure OSPF on a router
ccg s "configure ospf with process id 1 and advertise 192.168.1.0/24 for area 0" --level intermediate

# Create a Bash script to back up a directory
ccg s "create a backup of /etc/nginx"
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
Yes. CCG is **100% open-source**, **telemetry-free**, and **privacy-first**. Your commands, file paths, and system details are **not sent to any server** (in CLI mode), and the web version does **not store your prompts**.

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
Q5: Does CCG work on Windows, macOS, and Linux?
Yes! CCG is cross-platform and supports Windows (PowerShell, CMD), macOS (Bash, Zsh), Linux (Bash, Zsh), and now Cisco (CLI).

📜 License
This project is dual-licensed under the MIT License and the Apache License 2.0. See the LICENSE file for details.
