<div align="center">
  <h1 align="center">CMDGEN - Your Intelligent Command-Line Assistant</h1>
  <p align="center">
    Generate, analyze, script, and debug command-line instructions with an AI-powered assistant, right in your terminal.
  </p>

  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
  [![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
  [![Version](https://img.shields.io/badge/Version-2.3.0-brightgreen.svg)]()

</div>

---

**CMDGEN** is a smart, cross-platform tool that bridges the gap between natural language and the command line. Whether you're a seasoned sysadmin, a developer, or just starting out, CMDGEN helps you master the terminal with ease. This project features both a powerful **Command-Line Tool (CLI)** and a user-friendly **Web Application**.

### ✨ Key Features

* **AI-Powered Generation**: Describe what you want to do, and get the exact command you need.
* **Intelligent Scripting**: Turn multi-step tasks into ready-to-run scripts for PowerShell, Bash, and more.
* **In-depth Analysis**: Paste any command to get a detailed, expert-level explanation of what it does.
* **Error Debugging**: Got an error? CMDGEN analyzes it and gives you a step-by-step solution.
* **Command History**: Access your 20 most recently generated commands with the `history` command.
* **Cross-Platform**: Natively supports Windows, macOS, and Linux.

---

### 🚀 Quick Install (Recommended)

The installation script automatically detects your OS, downloads the correct version, and sets it up for you.

**For Linux & macOS:**
```bash
curl -fsSL https://raw.githubusercontent.com/amirhosseinyavari021/ay-cmdgen/main/install.sh | bash
```

**For Windows (in PowerShell as Administrator):**
```powershell
iwr https://raw.githubusercontent.com/amirhosseinyavari021/ay-cmdgen/main/install.ps1 | iex
```

After installation, **open a new terminal window** to start using `cmdgen`.

---

### ⚙️ How to Use

#### 1. First-Time Setup
The first time you run a command, CMDGEN will launch a quick setup wizard to learn about your OS and preferred shell. This ensures all future suggestions are perfectly tailored for your system.

```bash
# Just run any command to start the wizard
cmdgen g "list files"
```

#### 2. Generate Commands (`g`)
Stuck? Just ask.
```bash
# Get the top 5 processes by memory usage on Windows
cmdgen g "list the top 5 processes by memory usage in MB" --os windows --shell powershell

# Find large files on Linux
cmdgen g "find all files larger than 1GB in my home directory" --os linux --shell bash
```

#### 3. Create Scripts (`s`)
Automate complex tasks instantly.
```bash
# Create a PowerShell script to clean up the temp folder
cmdgen s "delete all files in my temp folder older than 7 days and report the space freed"

# Create a Bash script to back up a directory
cmdgen s "create a backup of /etc/nginx and save it as nginx-backup.tar.gz in /opt/backups"
```

#### 4. Analyze a Command (`a`)
Understand what a command does before you run it.
```bash
cmdgen a 'Get-CimInstance -ClassName Win32_BIOS | Format-List -Property *'
```

#### 5. Debug an Error (`e`)
Turn confusing error messages into clear solutions.
```bash
# Get help with a common PowerShell error
cmdgen e "execution of scripts is disabled on this system."

# Figure out a "command not found" error on Linux
cmdgen e "bash: docker: command not found"
```

#### 6. View Your History (`history`)
Quickly access your recently generated commands.
```bash
cmdgen history
```

---

### 💻 Web Version

Prefer a graphical interface? Use the web version instantly without any installation.
- **[https://cmdgen.onrender.com](https://cmdgen.onrender.com)**

---

### 👨‍💻 For Developers

Want to contribute or build from the source?

1.  **Clone the project:** `git clone https://github.com/amirhosseinyavari021/ay-cmdgen.git`
2.  **Install dependencies:** `cd ay-cmdgen && npm install`
3.  **Build all executables:** `npm run release`
    -   The output files will be in the `dist` folder.

---

### 📜 License

This project is dual-licensed under the MIT and Apache 2.0 licenses. See the [LICENSE](LICENSE) file for details.
