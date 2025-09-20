# CMDGEN - Your Intelligent Command-Line Assistant

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Apache License](https://img.shields.io/badge/License-Apache-green.svg)](LICENSE)

CMDGEN is a smart tool that helps you generate, analyze, and debug command-line (CLI) instructions with ease. This project features both a **Web Application** and a standalone **Command-Line Tool (CLI)**.

---

### 🚀 Quick Install (Recommended Method)

Open your terminal and run the command below. The script will automatically detect your OS, download the correct version, and install it.

**For Linux & macOS:**
```bash
curl -fsSL https://raw.githubusercontent.com/amirhosseinyavari021/ay-cmdgen/main/install.sh | bash
```
*(You might be asked for your admin (sudo) password to install `cmdgen` globally.)*

**For Windows (in PowerShell as Administrator):**
```powershell
iwr https://raw.githubusercontent.com/amirhosseinyavari021/ay-cmdgen/main/install.ps1 | iex
```

After the installation is complete, open a **new terminal window** and verify it by running `cmdgen --help`.

---

### ⚙️ Usage

The default language is **English**. You can switch to Persian (Farsi) by adding the `--lang fa` flag to any command.

- **Show the help menu:**
  ```bash
  cmdgen --help
  ```

- **Generate a new command:**
  ```bash
  # English request (default)
  cmdgen g "how to find all files larger than 100MB"

  # Persian request (using the language flag)
  cmdgen g "چطور فایل‌های بزرگتر از ۱۰۰ مگابایت را پیدا کنم" --lang fa
  ```

- **Analyze a command:**
  ```bash
  cmdgen a "tar -czvf archive.tar.gz /path/to/dir"
  ```

- **Debug an error:**
  ```bash
  cmdgen e "command not found: docker"
  ```

---

### 💻 Web Version

If you prefer a graphical interface, you can use the web version without any installation:
- **[https://cmdgen.onrender.com](https://cmdgen.onrender.com)**

---

### 👨‍💻 Developer's Guide

If you want to contribute or build the executables yourself:

1.  **Clone the project:** `git clone https://github.com/amirhosseinyavari021/ay-cmdgen.git`
2.  **Install dependencies:** `cd ay-cmdgen && npm install`
3.  **Build the executables:** `npm run release`
    - The output files will be in the `dist` folder.

To publish a new version, upload the generated executables from the `dist` folder to a new **Release** on GitHub. The installation script automatically fetches the latest release.

---

### 📜 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
