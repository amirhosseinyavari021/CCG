
# CMDGEN - Your Intelligent Command-Line Assistant
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://www.apache.org/licenses/LICENSE-2.0)
[![Version](https://img.shields.io/badge/Version-2.6.5-brightgreen.svg)](https://github.com/amirhosseinyavari021/ay-cmdgen/releases)
[![Website](https://img.shields.io/website?up_message=online&url=https%3A%2F%2Fcmdgen.onrender.com)](https://cmdgen.onrender.com)

Generate, analyze, script, and debug command-line instructions with an AI-powered assistant, right in your terminal.

CMDGEN is a smart, cross-platform tool that bridges the gap between natural language and the command line. Whether you're a seasoned sysadmin, a developer, or just starting out, CMDGEN helps you master the terminal with ease. This project features both a powerful Command-Line Tool (CLI) and a user-friendly Web Application.

🎉 What's New in Version 2.6.5 – Debug Flag & Performance Improvements & installing and updating bug fixed

This version introduces a new `--debug` flag for optional detailed logging, conditional parser logs for reduced console clutter, and overall code optimizations for better maintainability and efficiency.

New Features:
- 🔍 **Debug Flag**: Added `--debug` option to enable detailed `[PARSER]` logs for troubleshooting parser behavior. Use it with any command, e.g., `cmdgen generate "list files" --debug`.
- 📊 **Conditional Logging**: Parser logs now only appear when `--debug` is enabled, improving performance and user experience in normal usage.

Changes & Improvements:
- 🛠️ **Code Quality Enhancements**: Streamlined variable naming, added more comments, and optimized logging logic in `responseParser-cli.js` for better readability and efficiency.
- ⏱️ **Performance Optimizations**: Reduced unnecessary console outputs in non-debug mode, making the CLI faster and cleaner.
- 📈 **Help Menu Update**: Added `--debug` to the help menu for easier discovery.

These build on v2.6.0's logging system, making debugging more flexible while keeping the tool lightweight.

✨ Key Features

- AI-Powered Generation: Describe what you want to do, and get the exact command you need.
- Intelligent Scripting: Turn multi-step tasks into ready-to-run scripts for PowerShell, Bash, and more.
- In-depth Analysis: Paste any command to get a detailed, expert-level explanation of what it does.
- Error Debugging: Got an error? CMDGEN analyzes it and gives you a step-by-step solution.
- Enhanced Command History: Access your 20 most recently generated commands with detailed metadata including timestamps, session information, and execution status.
- Cross-Platform Support: Natively works on Windows, macOS, and Linux for seamless compatibility.
- Multi-Language Support: Available in both English and Persian to cater to a wider audience.
- Interactive Mode: After generating commands in the CLI, execute them directly, request more suggestions, or exit effortlessly.
- Configuration Management: Easily manage default settings (like OS and shell) using the intuitive config command.
- Self-Update Mechanism: Automatically upgrade to the latest version with a simple update command.
- User Feedback System: Share your thoughts directly via the feedback command or through automatic prompts to help improve the tool.
- Intelligent Uninstall: When removing the tool with the delete command, you can optionally provide feedback on why you're leaving.
- Advanced Analytics: Enhanced privacy-focused analytics with structured logging for better insights and improved AI responses.

🚀 Quick Install (Recommended)

The installation script automatically detects your OS, downloads the correct version, and sets it up for you.

⚠️ Administrator Privileges Required cmdgen requires administrator/root privileges for global installation. Global installations write files into system directories (e.g., /usr/local/bin on macOS/Linux or Program Files on Windows). These locations are protected, so elevated permissions are needed.

Why it matters: Without admin privileges, installation may fail with "permission denied" errors or the program may not be accessible globally.

How to Install

For macOS / Linux:
- Using NPM (recommended for Node.js users):
  ```
  sudo npm install -g @amirhosseinyavari/ay-cmdgen
  ```
- Using the installation script (requires sudo):
  ```
  curl -fsSL https://raw.githubusercontent.com/amirhosseinyavari021/ay-cmdgen/main/install.sh | sudo bash
  ```

For Windows:
- Open PowerShell as Administrator (right-click → Run as Administrator).
- Install via NPM:
  ```
  npm install -g @amirhosseinyavari/ay-cmdgen
  ```
- Or using the installation script:
  ```
  iwr https://raw.githubusercontent.com/amirhosseinyavari021/ay-cmdgen/main/install.ps1 | iex
  ```

✅ Tip for Users Without Admin Rights If you cannot run commands with sudo (macOS/Linux) or as Administrator (Windows), you can still use cmdgen without installing it globally by using npx.
npx is included with Node.js and allows you to run npm packages temporarily, without writing files to system directories, so admin privileges are not required.

Example:
```
npx @amirhosseinyavari/ay-cmdgen generate "list all files in system"
```

This runs the command directly without a global installation.

After Installation Open a new terminal window to start using cmdgen.
Verify the installation by running:
```
cmdgen 
```

⚙️ How to Use

Command Summary
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

1. First-Time Setup
The first time you run a command, CMDGEN will launch a quick setup wizard to learn about your OS and preferred shell. This ensures all future suggestions are perfectly tailored for your system.
```
# Just run any command to start the wizard
cmdgen g "list files"
```

2. Generate Commands (g)
Stuck? Just ask.
```
# Get the top 5 processes by memory usage on Windows
cmdgen g "list the top 5 processes by memory usage in MB" --os windows --shell powershell
```
```
# Find large files on Linux
cmdgen g "find all files larger than 1GB in my home directory" --os linux --shell bash
```

3. Create Scripts (s)
Automate complex tasks instantly.
```
# Create a PowerShell script to clean up the temp folder
cmdgen s "delete all files in my temp folder older than 7 days and report the space freed"
```
```
# Create a Bash script to back up a directory
cmdgen s "create a backup of /etc/nginx and save it as nginx-backup.tar.gz in /opt/backups"
```

4. Analyze a Command (a)
Understand what a command does before you run it.
```
cmdgen a 'Get-CimInstance -ClassName Win32_BIOS | Format-List -Property *'
```

5. Debug an Error (e)
Turn confusing error messages into clear solutions.
```
# Get help with a common PowerShell error
cmdgen e "execution of scripts is disabled on this system."
```
```
# Figure out a "command not found" error on Linux
cmdgen e "bash: docker: command not found"
```

6. View Your Enhanced History (history)
Quickly access your recently generated commands with detailed metadata including timestamps, session information, and execution status.
```
cmdgen history
```
New in v2.6.0: History now includes timestamps, session tracking, parsing success rates, and execution feedback.

7. Manage Configuration (config)
Run the setup wizard or view/manage your settings.
```
# Run the setup wizard to configure default OS and shell
cmdgen config wizard
# View current saved settings
cmdgen config show
```

8. Update the Tool (update)
Keep CMDGEN up-to-date with the latest features and fixes.
```
# Update cmdgen to the latest version
cmdgen update
```

🔍 Advanced Features (Updated in v2.6.4)
Enhanced Logging and Analytics
CMDGEN v2.6.5 builds on v2.6.0's logging with conditional debug output:
- Request/Response Tracking: All AI interactions are logged with context for better debugging.
- Parser Validation: Detailed line-by-line validation with success rate reporting.
- Performance Metrics: Response times, parsing efficiency, and error rate tracking.
- Session Analytics: Anonymous session tracking for usage pattern analysis.
- **New: Debug Mode**: Use `--debug` to enable detailed `[PARSER]` logs for in-depth troubleshooting without cluttering normal usage.

Improved Error Handling
- Context-Aware Errors: Error messages now include more context about what went wrong.
- Validation Feedback: Parser failures are logged with specific details for AI training improvement.
- Performance Monitoring: Track response times and identify bottlenecks.

Developer Benefits
If you're contributing to the project or running your own instance, the new logging system provides:
- Structured JSON logs for easy analysis.
- Performance benchmarks for optimization.
- Quality metrics for AI response validation.
- Anonymous usage analytics for product improvement.
- **New: Conditional Logging**: Logs only activate with `--debug`, improving efficiency during development.

💬 Community & Feedback
This project is built for the community, and your feedback is crucial for its growth. We've made it easy to share your thoughts.
Providing Feedback
You can share your ideas, suggestions, or report issues at any time using the feedback command:
```
cmdgen feedback
```
Additionally, after you've used the tool about 20 times, it will automatically ask if you'd like to provide feedback to help us improve.
Note: v2.6.0 includes enhanced feedback collection with better context about your usage patterns to help us improve the AI responses.

Uninstalling
We're sad to see you go, but if you need to uninstall cmdgen, you can use the delete command. This command will ask for confirmation and give you an option to share your reason for leaving, which helps us understand what we can do better.
```
cmdgen delete
```

💻 Web Version
Prefer a graphical interface? Use the web version instantly without any installation.
- https://cmdgen.onrender.com

The web version also includes all v2.6.5 enhancements including improved error handling, parser validation, and debug capabilities.

👨‍💻 For Developers
Want to contribute or build from the source?
1. Clone the project: git clone https://github.com/amirhosseinyavari021/ay-cmdgen.git
2. Install dependencies: cd ay-cmdgen && npm install
3. Build all executables: npm run release

The output files will be in the dist folder.

New in v2.6.5: Enhanced Development Experience
- Structured Logging: All logs are now in JSON format for easier analysis.
- Performance Metrics: Built-in timing and performance monitoring.
- Better Error Context: More detailed error information for debugging.
- Validation Logging: Parser validation results with success rates.
- **New: Debug Flag Integration**: Use `--debug` during development to inspect parser logs without permanent code changes.

Configuration
User settings are stored in a configuration file at ~/.cmdgen/config.json. Advanced users can manually edit this file if needed to customize their default OS, shell, or other preferences.
New in v2.6.0: Configuration now includes session tracking and enhanced history metadata.

🔒 Privacy & Data Handling
CMDGEN respects your privacy:
- Anonymous Analytics: We collect basic usage statistics with anonymized user IDs.
- No Personal Data: Your actual commands and prompts are not stored permanently.
- Session Tracking: Session IDs are used for improving user experience but are not tied to personal information.
- Local Storage: Your command history and settings remain on your local machine.
- **New in v2.6.5**: Debug logs are optional and only enabled on demand, ensuring no extra data collection in normal use.

Contributing
Contributions are welcome! If you'd like to help improve CMDGEN, please feel free to fork the repository and submit a pull request.

New Contributor Guidelines for v2.6.5:
- All new features should include structured logging.
- Error handling should provide detailed context.
- Parser enhancements should include validation metrics.
- Performance improvements should be measurable through the new metrics system.
- **New: Debug Practices**: Use the `--debug` flag in tests and document any logging additions.

📜 License
This project is dual-licensed under the MIT License and the Apache License 2.0. See the LICENSE file for details.

Version: 2.6.5 | Last Updated: September 2025 | Changelog: Added debug flag, conditional logging, and performance optimizations and installing and updating bug fixed 
