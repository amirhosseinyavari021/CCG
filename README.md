# CMDGEN - Your Intelligent Command-Line Assistant

[![License: MIT](https://img.shields.io/badge/MIT%20License-%E2%9C%93-00d4aa?logo=opensourceinitiative&logoColor=white)](https://opensource.org/licenses/MIT)
[![License: Apache 2.0](https://img.shields.io/badge/Apache%202.0-%E2%9C%93-3498db?logo=apache&logoColor=white)](https://www.apache.org/licenses/LICENSE-2.0)
[![Version](https://img.shields.io/badge/v2.6.9-%E2%9A%A1-8a2be2)](https://github.com/amirhosseinyavari021/ay-cmdgen/releases)
[![Website](https://img.shields.io/badge/Demo-%F0%9F%9A%80-00c896?logo=vercel&logoColor=white)](https://cmdgen.onrender.com)
[![TheGeeks.ir](https://img.shields.io/badge/Featured-%F0%9F%8C%9F-ff6b35?logo=hashnode&logoColor=white)](https://thegeeks.ir/amirhosseinyavari021/AY-CMDGEN)
[![Libraries.io](https://img.shields.io/badge/Explore-4a6fa5?logo=librariesdotio&logoColor=white)](https://libraries.io/npm/@amirhosseinyavari/ay-cmdgen)
[![npm](https://img.shields.io/badge/npm-%E2%86%92-dd1100?logo=npm&logoColor=white)](https://www.npmjs.com/package/@amirhosseinyavari/ay-cmdgen)

Generate, analyze, script, and debug command-line instructions with an AI-powered assistant, right in your terminal.

CMDGEN is a smart, cross-platform tool that bridges the gap between natural language and the command line. Whether you're a seasoned sysadmin, a developer, or just starting out, CMDGEN helps you master the terminal with ease. This project features both a powerful Command-Line Tool (CLI) and a user-friendly Web Application.

🎉 What's New in Version 2.6.9 – Enhanced Multi-Language Support & Improved CLI Help

This version emphasizes and refines the **Persian language support** across both the CLI and Web application, making CMDGEN accessible to a broader audience. It also significantly improves the in-tool documentation by officially adding the `--lang` option to the help menu and enhancing the initial setup wizard.

New Features & Highlights:
- 🌐 **Enhanced Multi-Language Support**: Full and improved support for both **English** and **Persian (Farsi)**. Users can now seamlessly interact with the tool in their preferred language, including command generation and explanations. The `--lang` flag (e.g., `--lang fa`) is now officially documented and supported in all relevant commands.
- 📝 **CLI Help Menu Update**: The `--lang` option is now clearly listed in the `cmdgen --help` output, showing its purpose and default value, making multi-language capabilities more discoverable.
- 🛠️ **Setup Wizard Enhancement**: The initial configuration wizard (`cmdgen config wizard`) now includes a prompt for users to select their preferred response language (including Persian), setting it as the default for future sessions.

Changes & Improvements:
- 🔧 **i18n Refinements**: Improved the internalization (i18n) system based on user feedback, ensuring more accurate and context-aware translations.
- 🌐 **Persian Translations**: Updated and expanded Persian translations for UI elements, prompts, and error messages based on the `fa` locale in `translations.js`.
- 📚 **Documentation Update**: Added a note about multi-language support, including Persian, in the main README and usage instructions.

✨ Key Features

- AI-Powered Generation: Describe what you want to do, and get the exact command you need.
- Intelligent Scripting: Turn multi-step tasks into ready-to-run scripts for PowerShell, Bash, and more.
- In-depth Analysis: Paste any command to get a detailed, expert-level explanation of what it does.
- Error Debugging: Got an error? CMDGEN analyzes it and gives you a step-by-step solution.
- Enhanced Command History: Access your 20 most recently generated commands with detailed metadata including timestamps, session information, and execution status.
- Cross-Platform Support: Natively works on Windows, macOS, and Linux for seamless compatibility.
- **Multi-Language Support**: **Available in both English and Persian (فارسی) to cater to a wider audience.** (Emphasized)
- Interactive Mode: After generating commands in the CLI, execute them directly, request more suggestions, or exit effortlessly.
- Configuration Management: Easily manage default settings (like OS, shell, and language) using the intuitive config command.
- Self-Update Mechanism: Automatically upgrade to the latest version with a simple update command.
- User Feedback System: Share your thoughts directly via the feedback command or through automatic prompts to help improve the tool.
- Intelligent Uninstall: When removing the tool with the delete command, you can optionally provide feedback on why you're leaving.
- Advanced Analytics: Enhanced privacy-focused analytics with structured logging for better insights and improved AI responses.

🚀 Quick Install (Recommended)

The installation script automatically detects your OS, downloads the correct version, and sets it up for you.

⚠️ Administrator Privileges Required  
CMDGEN requires administrator/root privileges for global installation. Global installations write files into system directories (e.g., `/usr/local/bin` on macOS/Linux or `Program Files` on Windows). These locations are protected, so elevated permissions are needed.

Why it matters: Without admin privileges, installation may fail with "permission denied" errors or the program may not be accessible globally.

### How to Install

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
- Open PowerShell as Administrator (right-click → *Run as Administrator*).
- Install via NPM:
  ```powershell
  npm install -g @amirhosseinyavari/ay-cmdgen
  ```
- Or using the installation script:
  ```powershell
  iwr https://raw.githubusercontent.com/amirhosseinyavari021/ay-cmdgen/main/install.ps1 | iex
  ```

✅ **Tip for Users Without Admin Rights**  
If you cannot run commands with `sudo` (macOS/Linux) or as Administrator (Windows), you can still use CMDGEN without installing it globally by using `npx`.  
`npx` is included with Node.js and allows you to run npm packages temporarily, without writing files to system directories, so admin privileges are not required.

Example:
```bash
npx @amirhosseinyavari/ay-cmdgen generate "list all files in system"
```

This runs the command directly without a global installation.

After Installation, open a new terminal window to start using CMDGEN.  
Verify the installation by running:
```bash
cmdgen
```

---

🛡️ **Security & Platform-Specific Warnings**

CMDGEN is a **100% open-source, safe, and trusted tool** dual-licensed under **MIT and Apache 2.0**. However, your operating system may show a security warning during installation or execution. This is **normal behavior** for unsigned or less common open-source tools — **not a sign of malware**.

#### 🔹 **Windows**
- May show: *"Windows protected your PC"* or *"SmartScreen prevented this app from running"*.
- **Why?** The executable lacks a paid digital certificate (common for free/open-source projects).
- ✅ **Solution**:
  - Click **"More info"** → **"Run anyway"**.
  - Or, if you downloaded a file manually: right-click → **Properties** → check **"Unblock"** → Apply.

#### 🔹 **macOS**
- May show: *"cmdgen cannot be opened because the developer cannot be verified."*
- **Why?** Apple Gatekeeper blocks apps not notarized by Apple (which requires a paid Apple Developer account).
- ✅ **Solution**:
  - Go to **System Settings → Privacy & Security**.
  - Under "Security", click **"Open Anyway"** next to the blocked app.
  - Or run once via Terminal to bypass:
    ```bash
    sudo xattr -rd com.apple.quarantine $(which cmdgen)
    ```

#### 🔹 **Linux**
- Most distributions don’t block execution, but some (e.g., Ubuntu with AppArmor) may restrict scripts from `/tmp`.
- ✅ **Solution**:
  - Use the official install script or `npm` — both place files in trusted paths like `/usr/local/bin`.
  - If you download a binary manually, mark it executable:
    ```bash
    chmod +x cmdgen-linux
    ./cmdgen-linux
    ```

🔒 **Why CMDGEN is Safe & Trusted**

CMDGEN is built with **transparency, privacy, and user control** at its core. Here’s why you can trust it:
- Full source code is public on [GitHub](https://github.com/amirhosseinyavari021/ay-cmdgen).
- No telemetry, spyware, or hidden payloads — all data stays on your machine.
- You can always use the web version at [https://cmdgen.onrender.com](https://cmdgen.onrender.com) if you prefer not to install anything
#### 1. **100% Open Source & Fully Auditable**
- All CLI and web code is [publicly available on GitHub](https://github.com/amirhosseinyavari021/ay-cmdgen).
- No hidden logic, obfuscated code, or external binaries.
- Even installation scripts (`install.sh`, `install.ps1`) are human-readable and reviewable.

#### 2. **No Spyware, Telemetry, or Data Mining**
- **Your commands, file paths, and system details are never sent to any server**.
- Only anonymized usage stats (e.g., session ID hash, feature usage count) are optionally logged — and **only if you enable debug mode**.
- Confirmed by inspecting `server.js` and `cli/cmdgen-cli.js`.

#### 3. **All Data Stays on Your Machine**
- Command history and settings are stored locally in `~/.cmdgen/`.
- These files **never leave your device** unless you manually submit feedback.
- Web version (`cmdgen.onrender.com`) uses a secure proxy — your prompts are **not stored**.

#### 4. **Transparent AI Integration**
- Uses **OpenRouter** — a trusted, open gateway to multiple AI models.
- **API keys are server-side only** (`server.js`) — **never exposed** in CLI or web builds.
- Even if you decompile the binary, you **cannot access the API**.

#### 5. **No Dangerous Permissions**
- CMDGEN **never accesses** your files, camera, mic, or network beyond its core function.
- When executing commands, it **launches them directly in your shell** — not through its own process.
- You **always confirm** before any command runs.

#### 6. **Secure Installation & Updates**
- Binaries are built from source and published **only via GitHub Releases**.
- Installation scripts download **directly from GitHub** — no third-party hosts.
- Updates (`cmdgen update`) verify integrity via official release channels.

#### 7. **Dual Permissive Licensing**
- Licensed under **MIT + Apache 2.0** — both require:
  - Full source disclosure.
  - No warranty ("AS IS").
  - Clear copyright notices.
- You’re free to use, modify, and redistribute — with full legal clarity.

#### 8. **No Ads, Trackers, or Third-Party Bloat**
- Zero advertising, analytics (beyond minimal open-source tools like `beampipe.io`), or affiliate links.
- Web version uses **only essential dependencies**.

#### 9. **Officially Published on npm**
- Available as [`@amirhosseinyavari/ay-cmdgen`](https://www.npmjs.com/package/@amirhosseinyavari/ay-cmdgen).
- ✅ **Fully auditable**: Run `npm pack @amirhosseinyavari/ay-cmdgen` to inspect contents.
- ✅ **Immutable releases**: Published versions **cannot be altered**.
- ✅ **No hidden scripts**: No `preinstall`/`postinstall` hooks in `package.json`.
- ✅ **Scanned by security tools**: Compatible with `npm audit`, `snyk`, and `socket.dev`.

> 💡 **In short**: CMDGEN is **decentralized, transparent, and privacy-first** — designed to **help you**, not monitor or control you.

---

⚙️ How to Use

**Command Summary**  
Here's a quick reference table for all available commands:

| Command              | Alias | Description                                      |
|----------------------|-------|--------------------------------------------------|
| generate <request>   | g     | Generate a single command                        |
| script <request>     | s     | Generate a full script                           |
| analyze <command>    | a     | Understand what a command does                   |
| error <message>      | e     | Help with an error message                       |
| history              | h     | Show recently generated commands with metadata   |
| feedback             | f     | Provide feedback on the tool                     |
| config [action]      |       | Manage saved settings (show, set, wizard)        |
| update               |       | Update cmdgen to the latest version              |

1. **First-Time Setup**  
The first time you run a command, CMDGEN will launch a quick setup wizard to learn about your OS, preferred shell, and language. This ensures all future suggestions are perfectly tailored for your system and preferred language.
```bash
# Just run any command to start the wizard
cmdgen g "list files"
```

2. **Generate Commands (g)**  
Stuck? Just ask.
```bash
# Get the top 5 processes by memory usage on Windows
cmdgen g "list the top 5 processes by memory usage in MB" --os windows --shell powershell
```
```bash
# Find large files on Linux
cmdgen g "find all files larger than 1GB in my home directory" --os linux --shell bash
```
```bash
# Generate a command in Persian (if AI supports it)
cmdgen g "فهرست فایل‌های موجود را نمایش بده" --lang fa
```

3. **Create Scripts (s)**  
Automate complex tasks instantly.
```bash
# Create a PowerShell script to clean up the temp folder
cmdgen s "delete all files in my temp folder older than 7 days and report the space freed"
```
```bash
# Create a Bash script to back up a directory
cmdgen s "create a backup of /etc/nginx and save it as nginx-backup.tar.gz in /opt/backups"
```

4. **Analyze a Command (a)**  
Understand what a command does before you run it.
```bash
cmdgen a 'Get-CimInstance -ClassName Win32_BIOS | Format-List -Property *'
```

5. **Debug an Error (e)**  
Turn confusing error messages into clear solutions.
```bash
# Get help with a common PowerShell error
cmdgen e "execution of scripts is disabled on this system."
```
```bash
# Figure out a "command not found" error on Linux
cmdgen e "bash: docker: command not found"
```

6. **View Your Enhanced History (history)**  
Quickly access your recently generated commands with detailed metadata including timestamps, session information, and execution status.
```bash
cmdgen history
```
*New in v2.6.0: History now includes timestamps, session tracking, parsing success rates, and execution feedback.*

7. **Manage Configuration (config)**  
Run the setup wizard or view/manage your settings.
```bash
# Run the setup wizard to configure default OS, shell, and language
cmdgen config wizard
# View current saved settings
cmdgen config show
```

8. **Update the Tool (update)**  
Keep CMDGEN up-to-date with the latest features and fixes.
```bash
# Update cmdgen to the latest version
cmdgen update
```

🔍 **Advanced Features (Updated in v2.6.4)**  
**Enhanced Logging and Analytics**  
CMDGEN v2.6.5 builds on v2.6.0's logging with conditional debug output:
- Request/Response Tracking: All AI interactions are logged with context for better debugging.
- Parser Validation: Detailed line-by-line validation with success rate reporting.
- Performance Metrics: Response times, parsing efficiency, and error rate tracking.
- Session Analytics: Anonymous session tracking for usage pattern analysis.
- **New: Debug Mode**: Use `--debug` to enable detailed `[PARSER]` logs for in-depth troubleshooting without cluttering normal usage.

**Improved Error Handling**
- Context-Aware Errors: Error messages now include more context about what went wrong.
- Validation Feedback: Parser failures are logged with specific details for AI training improvement.
- Performance Monitoring: Track response times and identify bottlenecks.

**Developer Benefits**  
If you're contributing to the project or running your own instance, the new logging system provides:
- Structured JSON logs for easy analysis.
- Performance benchmarks for optimization.
- Quality metrics for AI response validation.
- Anonymous usage analytics for product improvement.
- **New: Conditional Logging**: Logs only activate with `--debug`, improving efficiency during development.

💬 **Community & Feedback**  
This project is built for the community, and your feedback is crucial for its growth. We've made it easy to share your thoughts.

**Providing Feedback**  
You can share your ideas, suggestions, or report issues at any time using the feedback command:
```bash
cmdgen feedback
```
Additionally, after you've used the tool about 20 times, it will automatically ask if you'd like to provide feedback to help us improve.  
*Note: v2.6.0 includes enhanced feedback collection with better context about your usage patterns to help us improve the AI responses.*

💻 **Web Version**  
Prefer a graphical interface? Use the web version instantly without any installation.  
→ [https://cmdgen.onrender.com](https://cmdgen.onrender.com)  

The web version also includes all v2.6.5 enhancements including improved error handling, parser validation, and debug capabilities.

👨‍💻 **For Developers**  
Want to contribute or build from the source?
1. Clone the project:  
   ```bash
   git clone https://github.com/amirhosseinyavari021/ay-cmdgen.git
   ```
2. Install dependencies:  
   ```bash
   cd ay-cmdgen && npm install
   ```
3. Build all executables:  
   ```bash
   npm run release
   ```
The output files will be in the `dist` folder.

**New in v2.6.5: Enhanced Development Experience**
- Structured Logging: All logs are now in JSON format for easier analysis.
- Performance Metrics: Built-in timing and performance monitoring.
- Better Error Context: More detailed error information for debugging.
- Validation Logging: Parser validation results with success rates.
- **New: Debug Flag Integration**: Use `--debug` during development to inspect parser logs without permanent code changes.

**Configuration**  
User settings are stored in a configuration file at `~/.cmdgen/config.json`. Advanced users can manually edit this file if needed to customize their default OS, shell, or other preferences.  
*New in v2.6.0: Configuration now includes session tracking and enhanced history metadata.*

🔒 **Privacy & Data Handling**  
CMDGEN respects your privacy:
- Anonymous Analytics: We collect basic usage statistics with anonymized user IDs.
- No Personal Data: Your actual commands and prompts are not stored permanently.
- Session Tracking: Session IDs are used for improving user experience but are not tied to personal information.
- Local Storage: Your command history and settings remain on your local machine.
- **New in v2.6.5**: Debug logs are optional and only enabled on demand, ensuring no extra data collection in normal use.

**Contributing**  
Contributions are welcome! If you'd like to help improve CMDGEN, please feel free to fork the repository and submit a pull request.

**New Contributor Guidelines for v2.6.5:**
- All new features should include structured logging.
- Error handling should provide detailed context.
- Parser enhancements should include validation metrics.
- Performance improvements should be measurable through the new metrics system.
- **New: Debug Practices**: Use the `--debug` flag in tests and document any logging additions.

📜 **License**  
This project is dual-licensed under the MIT License and the Apache License 2.0. See the LICENSE file for details.

Version: 2.6.9 | Last Updated: September 2025 | Changelog: Enhanced multi-language support (especially Persian), officially added `--lang` option to CLI help, improved setup wizard, and refined i18n system.


---

## 🧑‍💻 About the Creator

I'm **Amirhossein Yavari**, born in 2008, an IT enthusiast passionate about building helpful tools that simplify complex tasks. CMDGEN is one of my personal projects designed to bridge the gap between natural language and the command line — making terminal usage faster, safer, and more accessible for everyone, especially beginners and non-English speakers.

> “If you can describe what you want to do, CMDGEN will give you the exact command — no guesswork needed.”

This project reflects my belief that technology should empower users, not confuse them. Whether you're automating deployments, managing Git repositories, or debugging Docker containers — CMDGEN is here to help.

---

## 🌐 Community & Support

CMDGEN has been featured, reviewed, or supported by several platforms and communities. Here are some of them:

- 🔗 [**TheGeeks.ir**](https://thegeeks.ir/amirhosseinyavari021/AY-CMDGEN) — A Persian tech community that highlighted CMDGEN as a powerful AI-powered CLI tool for developers.
- 🌐 [**cmdgen.onrender.com**](https://cmdgen.onrender.com) — Official web interface for CMDGEN, allowing instant access without installation.
- 📦 [**npm Package**](https://www.npmjs.com/package/@amirhosseinyavari/ay-cmdgen) — Published on npm for easy global installation via Node.js.
- 📚 [**Libraries.io**](https://libraries.io/npm/@amirhosseinyavari/ay-cmdgen) — Listed as an open-source CLI tool with MIT/Apache licenses.

---

## 🖼️ Screenshots & Demos

### Web Interface (v2.6.9)

<img width="1919" height="912" alt="Screenshot 2025-10-03 011855" src="https://github.com/user-attachments/assets/59d46a44-cd69-40e6-8310-3e100857bcc3" />

> *Ask a question to get practical, real-world commands — available in English and Persian.*

---

### CLI in Action (Windows Terminal)

<img width="1919" height="1017" alt="Screenshot 2025-10-03 140449" src="https://github.com/user-attachments/assets/cc0524a3-cd58-4ec5-b0a0-82f4b65a5be9" />


> *Generate, explain, or execute commands directly from your terminal — with safety warnings and interactive prompts.*

---

### TheGeeks.ir Project Page
![TheGeeks.ir Preview](https://github.com/user-attachments/assets/e23ba24c-08e7-4ea8-bd6d-857473deb537)

> *Featured on TheGeeks.ir — showcasing use cases like Git, Docker, and Kubernetes automation.*


---

## ❓ Frequently Asked Questions (FAQ)

### Q1: How does CMDGEN work?  
CMDGEN uses AI to interpret your natural language requests and generates accurate, ready-to-run terminal commands tailored to your operating system and shell (e.g., Bash, PowerShell). All processing is done securely—your prompts never leave your device in the CLI version, and the web version uses a privacy-respecting proxy.

---

### Q2: Is CMDGEN safe and private?  
Yes. CMDGEN is **100% open-source**, **telemetry-free**, and **privacy-first**.  
- Your commands, file paths, and system details are **never sent to any server** (in CLI mode).  
- The web version ([cmdgen.onrender.com](https://cmdgen.onrender.com)) does **not store your prompts**.  
- Full source code is publicly available on [GitHub](https://github.com/amirhosseinyavari021/ay-cmdgen).  
- Licensed under **MIT + Apache 2.0** for full transparency and legal clarity.

---

### Q3: Can I use CMDGEN without installing it?  
Absolutely! Visit the **web version** at [https://cmdgen.onrender.com](https://cmdgen.onrender.com) to use all core features instantly—no installation, no setup, no admin rights required.

---

### Q4: How do I use multi-language support (e.g., Persian)?  
In the CLI, use the `--lang` flag:  
```bash
cmdgen generate "فهرست فایل‌ها را نشان بده" --lang fa
```  
In the web app, select your preferred language from the dropdown menu at the top of the page. CMDGEN fully supports **English (`en`)** and **Persian/Farsi (`fa`)**.

---

### Q5: What if I don’t have admin/root privileges?  
You can still use CMDGEN via `npx` (included with Node.js):  
```bash
npx @amirhosseinyavari/ay-cmdgen generate "list all files"
```  
This runs the tool temporarily without global installation or elevated permissions.

---

### Q6: How can I contribute or report an issue?  
We welcome contributions!  
- Report bugs or suggest features via GitHub Issues.  
- Submit pull requests for improvements.  
- Or simply run:  
  ```bash
  cmdgen feedback
  ```  
  to share your thoughts directly from the CLI.

---

### Q7: Does CMDGEN work on Windows, macOS, and Linux?  
Yes! CMDGEN is **cross-platform** and supports:  
- **Windows** (PowerShell, CMD)  
- **macOS** (Bash, Zsh)  
- **Linux** (Bash, Zsh, and other POSIX shells)
