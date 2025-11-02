# CCG (Cando Command Generator) - Your Intelligent Command-Line Assistant

[![Hosted by Cando Academy](https://img.shields.io/badge/Hosted%20by-Cando%20Academy-yellow)](https://cando.ac)
[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red)](LICENSE)
[![Version](https://img.shields.io/badge/Release-v3.0.9-8a2be2)](https://github.com/amirhosseinyavari021/CCG/releases)
[![Website](https://img.shields.io/badge/Web_app-HERE-FFD700)](https://ccg.cando.ac)
[![npm](https://img.shields.io/badge/Published_on-npm-dd1100)](https://www.npmjs.com/package/@amirhosseinyavari/ccg)


🎉 **What's New in Version 3.0.9 – Smart Code Compare & AI Fallback!**

This major release introduces the **Smart Code Compare** feature for both the Web and CLI, adds new platforms (**FortiGate**, **MikroTik**), and implements a resilient AI backend with fallback support for local models.

  - **✨ NEW: Smart Code Compare (Web & CLI)**: Compare two code snippets or files. The AI provides a logical difference analysis, a code quality & security review, and a suggested smart merge.
  - **✨ NEW: CLI `compare` Command**: Use `ccg compare <fileA> <fileB>` for a full AI-powered comparison directly in your terminal.
  - **✨ NEW: Platform Support**: Added full support for **FortiGate (FortiOS)** and **MikroTik (RouterOS)**.
  - **✨ NEW: Resilient AI Backend**: The server now automatically falls back to a local model (like Ollama) if the primary AI service (OpenAI) fails, ensuring higher availability.
  - **✨ NEW: CLI `update` Command**: Keep your tool up-to-date with a simple `ccg update` command.
  - **✨ NEW: CLI `feedback` Command**: Open the feedback form directly using `ccg feedback`.

✨ **Key Features**

  - **AI-Powered Generation**: Describe what you want to do and get the exact command you need, tailored to your **OS**, **Device Type** (Cisco, FortiGate), and **Knowledge Level**.
  - **Intelligent Scripting**: Turn multi-step tasks into ready-to-run scripts for PowerShell, Bash, and network devices.
  - **In-depth Analysis**: Paste any command to get a detailed explanation customized to your level of expertise.
  - **Error Debugging**: Got an error? CCG analyzes it and gives you a step-by-step solution.
  - **NEW: Smart Code Compare**: Analyze the logical differences, review quality, and get merge suggestions for any two code snippets.
  - **Cross-Platform Support**: Natively works on Windows, macOS, Linux, **Cisco**, **MikroTik**, and **FortiGate**.
  - **Multi-Language Support**: Available in both **English** and **Persian (فارسی)**.
  - **Interactive Mode (CLI)**: Directly execute generated commands, request more suggestions, or exit effortlessly.
  - **Configuration Management**: Easily manage your default settings (OS, shell, language, knowledge level) with the `config` command.
  - **Self-Update Mechanism**: Keep your tool up-to-date with a simple `ccg update` command.

🚀 **Quick Install (Recommended)**

**Administrator Privileges are typically required for global installation.**

### **For macOS / Linux**

The recommended way to install and update is with NPM:

```bash
sudo npm install -g @amirhosseinyavari/ccg
````

*To update, run `ccg update` or re-run the install command.*

### **For Windows**

Open PowerShell as **Administrator** and run:

```powershell
npm install -g @amirhosseinyavari/ccg
```

*To update, run `ccg update` or re-run the install command.*

✅ **Tip for Users Without Admin Rights**
You can use `npx` to run CCG without a global installation:

```bash
npx @amirhosseinyavari/ccg generate "list all files"
```

After installation, open a **new terminal window** and verify by running: `ccg --help`

-----

**⚠️ Important Note on Running Downloaded Files (Manual Install)**

If you download the executable files (`ccg-win.exe`, `ccg-macos`, `ccg-linux`) directly from the **GitHub Releases** page, your operating system might show a security warning. This happens because the application is not "Code Signed" by Apple or Microsoft.

**We assure you that this project is 100% safe.** This tool is endorsed, featured, and used by **Cando Academy (Cando.ac)**, one of the top IT training centers in the country. The full source code is also available in this repository for complete transparency.

### **How to Bypass the Security Warning?**

  * **On Windows (Windows Defender SmartScreen):**

    1.  When the blue "Windows protected your PC" dialog appears, click on **'More info'**.
    2.  A new button, **'Run anyway'**, will appear at the bottom. Click it to run the application.

  * **On macOS (Gatekeeper):**

    1.  If you get a warning that "ccg-macos cannot be opened because it is from an unidentified developer," go to **System Settings \> Privacy & Security**.
    2.  Scroll down, and you will see a message about "ccg-macos". Click the **'Open Anyway'** button.
    3.  *Alternatively:* **Right-click** the `ccg-macos` file, select **'Open'** from the context menu, and then click **'Open'** in the confirmation dialog.

  * **On Linux:**

    1.  You usually won't get a security warning, but you must make the file executable.
    2.  Run the following command in your terminal: `chmod +x ./ccg-linux`

-----

⚙️ **How to Use**

**Command Summary**

| Command | Alias | Description |
|---|---|---|
| `generate <request>` | `g` | Generate command suggestions |
| `script <request>` | `s` | Generate a full script |
| `analyze <command>` | `a` | Understand what a command does |
| `error <message>` | `e` | Help with an error message |
| `compare <fileA> <fileB>` | `c` | Smart AI code compare |
| `history` | `h` | Show recently generated items |
| `feedback` | `f` | Provide feedback on the tool |
| `config [action]` | | Manage settings (show, set, wizard) |
| `update` | | Update CCG to the latest version |

**1. Generate Commands (g)**
Stuck? Just ask.

```bash
# Get a simple FortiGate command for a beginner
ccg g "show system interface" --os fortigate --level beginner

# Get an advanced command to find large files on Linux for an expert
ccg g "find all files larger than 1GB" --os ubuntu --level expert
```

**2. Create Scripts (s)**
Automate complex tasks instantly.

```bash
# Create a robust Cisco script to configure OSPF on a router
ccg s "configure ospf with process id 1 and advertise 192.168.1.0/24 for area 0" --os cisco --device router

# Create a Bash script to back up a directory
ccg s "create a backup of /etc/nginx"
```

**3. Compare Code (c)**
Understand changes between two files with AI.

```bash
# Compare two versions of a script
ccg compare ./old_script.py ./new_script.py
```

💻 **Web Version**
Prefer a graphical interface? Use the web version instantly without any installation.
→ [https://ccg.cando.ac/](https://ccg.cando.ac/)

The web version includes all features, including **Command Generation** and the new **Smart Code Compare** interface.

-----

## 🧑‍💻 About the Creator

I'm **Amirhossein Yavari**, an IT enthusiast passionate about building helpful tools that simplify complex tasks. CCG is one of my personal projects designed to bridge the gap between natural language and the command line — making terminal usage faster, safer, and more accessible for everyone. This project is now proudly part of the Cando Academy toolkit.

-----

## ❓ Frequently Asked Questions (FAQ)

**Q1: Is CCG safe and private?**
Yes. Both the web app and CLI send your prompts to the Cando server (`ccg.cando.ac`), which securely proxies the request to an upstream AI provider (like OpenAI) or a local model. **Your prompts are not stored.**

**Q2: Can I use CCG without installing it?**
Absolutely\! Visit the **web version** at [https://ccg.cando.ac/](https://ccg.cando.ac/) to use all core features instantly—no installation required.

**Q3: How do I use the new network device support?**
In the CLI, use `--os cisco`, `--os mikrotik`, or `--os fortigate`. In the web app, select them from the "Platform / OS" dropdown menu. For Cisco, you can also specify `--device <type>` (router, switch, or firewall).

**Q4: How does the Knowledge Level feature work?**
Specify your expertise (`beginner`, `intermediate`, or `expert`) using the `--level` flag in the CLI or the dropdown in the web app. The AI will adjust the complexity, explanation, and style of its response accordingly.

**Q5: What platforms does CCG support?**
CCG supports Windows (PowerShell, CMD), macOS (Bash, Zsh), Linux (Bash, Zsh), **Cisco** (CLI), **MikroTik** (CLI), and **FortiGate** (CLI).

-----

📜 **License**
This project is protected by an exclusive **Proprietary License Agreement**.
Copyright (c) 2024 Amirhossein Yavari & Cando Academy. All Rights Reserved.

Use is granted free of charge for personal, educational, research, and internal non-commercial operations. Commercial use, modification, and redistribution are strictly prohibited without a separate written agreement.

See the `LICENSE` file for full terms and contact details for commercial licensing.

```
```
