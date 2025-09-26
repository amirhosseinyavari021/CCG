#!/usr/bin/env node
/**
 * cmdgen-cli.js (fixed & merged)
 *
 * - Imports callApi from apiService-cli.js (fixed).
 * - Keeps previous CLI features (generate, script, analyze, error, history, feedback, config, update, delete).
 * - Improved error handling and clear messages when LLM or network fails.
 * - Removed duplicate function definitions and merged best behaviors from repo.
 */

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const axios = require('axios/dist/node/axios.cjs');
const { spawn, execSync } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs-extra');
const semver = require('semver');
const readline = require('readline');
const chalk = require('chalk');
const open = require('open');
const packageJson = require('./package.json');

const { getSystemPrompt, callApi } = require('./apiService-cli.js');
const { parseAndConstructData } = require('./responseParser-cli.js'); // kept for compatibility if needed

// --- feedback/uninstall constants ---
const FEEDBACK_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSdt_16-wZOgOViET55XwQYAsetfWxQWDW1DBb4yks6AgtOI9g/viewform?usp=header';
const UNINSTALL_REASON_FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSeKgyrKv_owvzTgF6iULQ-YeUBf1eRRwOdKw9Ho3JvZ2A0VwA/formResponse';
const UNINSTALL_REASON_ENTRY_ID = 'entry.183938337';
const USAGE_THRESHOLD_FOR_FEEDBACK = 20;
// ------------------------------------

const configDir = path.join(os.homedir(), '.cmdgen');
const configFile = path.join(configDir, 'config.json');
const MAX_HISTORY = 20;
const NPM_PACKAGE_NAME = packageJson.name || 'ay-cmdgen';

async function getConfig() {
  await fs.ensureDir(configDir);
  if (await fs.pathExists(configFile)) {
    try {
      const config = await fs.readJson(configFile);
      if (!config.history) config.history = [];
      if (config.usageCount === undefined) config.usageCount = 0;
      if (config.feedbackRequested === undefined) config.feedbackRequested = false;
      return config;
    } catch (error) {
      console.error(chalk.yellow('Warning: Configuration file was corrupted and has been reset.'));
      await fs.remove(configFile);
      return { history: [], usageCount: 0, feedbackRequested: false };
    }
  }
  return { history: [], usageCount: 0, feedbackRequested: false };
}

async function setConfig(newConfig) {
  const currentConfig = await getConfig();
  await fs.writeJson(configFile, { ...currentConfig, ...newConfig });
}

async function addToHistory(commandItem) {
  const config = await getConfig();
  const history = config.history || [];
  // prevent exact duplicates
  if (history.some(item => item.command === commandItem.command && item.explanation === commandItem.explanation)) return;
  history.unshift(commandItem);
  if (history.length > MAX_HISTORY) {
    history.pop();
  }
  await setConfig({ history });
}

async function incrementUsageCount() {
  const cfg = await getConfig();
  const usageCount = (cfg.usageCount || 0) + 1;
  await setConfig({ usageCount });
}

function printCommandResult(commands) {
  commands.forEach((cmd, i) => {
    console.log(chalk.cyan.bold(`\nCommand #${i + 1}:`));
    console.log(chalk.green(cmd.command));
    if (cmd.explanation) {
      console.log(chalk.gray(`Explanation: ${cmd.explanation}`));
    }
    if (cmd.warning) {
      console.log(chalk.yellow(`WARNING: ${cmd.warning}`));
    }
  });
}

function printScriptResult(script, explanation) {
  console.log(chalk.cyan.bold('\nGenerated Script:'));
  console.log(chalk.green(script));
  if (explanation) {
    console.log(chalk.gray(`Explanation: ${explanation}`));
  }
}

function printAnalyzeResult(command, explanation) {
  console.log(chalk.cyan.bold('\nCommand Analysis:'));
  console.log(chalk.green(command));
  if (explanation) {
    console.log(chalk.gray(explanation));
  }
}

function printErrorHelp(message, help) {
  console.log(chalk.cyan.bold('\nError Help:'));
  console.log(chalk.yellow(message));
  console.log(chalk.gray(help));
}

async function handleFeedback(force = false) {
  const config = await getConfig();
  if ((config.usageCount >= USAGE_THRESHOLD_FOR_FEEDBACK && !config.feedbackRequested) || force) {
    console.log(chalk.cyan.bold('\n--- We Value Your Feedback! ---'));
    console.log("You've used CMDGEN several times. Would you mind sharing your thoughts to help us improve?");

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const question = (query) => new Promise(resolve => rl.question(query, resolve));
    
    const answer = await question(chalk.yellow('Open feedback form in browser? (y/N) '));
    rl.close();

    if (answer.trim().toLowerCase() === 'y') {
      console.log(chalk.green('Thank you! Opening the form in your browser...'));
      try {
        await open(FEEDBACK_URL);
      } catch (err) {
        console.error(chalk.red('Could not open browser automatically. Please open this link manually:'));
        console.log(chalk.yellow(FEEDBACK_URL));
      }
    } else {
      console.log(chalk.gray('You can always provide feedback later via:'));
      console.log(chalk.yellow(FEEDBACK_URL));
    }
    
    await setConfig({ feedbackRequested: true });
  }
}

const showHelp = (config = {}) => {
  const osDefault = chalk.yellow(config.os || 'not set');
  const shellDefault = chalk.yellow(config.shell || 'not set');

  console.log(chalk.cyan(`
█▀▀ █▄█ █▀▄ █▀▀ █▄█ █▄░█
█▄▄ ░█░ █▄▀ ██▄ ░█░ █░▀█
`));
  console.log(chalk.bold('cmdgen - Your AI-powered command generator\n'));
  console.log(chalk.bold('Usage:'));
  console.log('  cmdgen <command> [options]\n');
  console.log(chalk.bold('Examples:'));
  console.log(chalk.gray('  cmdgen generate "list all files in Linux"'));
  console.log(chalk.gray('  cmdgen script "backup all .log files into a zip"'));
  console.log(chalk.gray('  cmdgen feedback\n'));
  console.log(chalk.bold('Commands:'));
  console.log(`  ${chalk.green('generate <request>')}    Generate a single command           [alias: g]`);
  console.log(`  ${chalk.green('script <request>')}      Generate a full script              [alias: s]`);
  console.log(`  ${chalk.green('analyze <command>')}     Understand what a command does      [alias: a]`);
  console.log(`  ${chalk.green('error <message>')}       Help with an error message          [alias: e]`);
  console.log(`  ${chalk.green('history')}               Show recently generated commands`);
  console.log(`  ${chalk.green('feedback')}               Provide feedback on the tool        [alias: f]`);
  console.log(`  ${chalk.green('config <action>')}       Manage saved settings (show, set, wizard)`);
  console.log(`  ${chalk.green('update')}                Update cmdgen to the latest version`);
  console.log(`  ${chalk.green('delete')}                Uninstall cmdgen from your system   [alias: d]\n`);
  console.log(chalk.bold('Options:'));
  console.log(`  --os                  Target OS (e.g., windows, linux)  [default: ${osDefault}]`);
  console.log(`  --shell               Target shell (e.g., PowerShell, bash) [default: ${shellDefault}]`);
  console.log('  -h, --help            Show this help menu');
  console.log('  -v, --version         Show version number');
  console.log('For more details, run: cmdgen --help');
};

const gracefulExit = () => {
  console.log(chalk.green(`\n🙏  Thank you for using cmdgen!  `));
  process.exit(0);
};

const runSetupWizard = async () => {
  console.log(chalk.cyan('\n--- CMDGEN Setup Wizard ---'));
  console.log('This setup saves your default OS and Shell for future use.');
  
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const question = (query) => new Promise(resolve => rl.question(query, resolve));

  const osOptions = ['Windows', 'macOS', 'Linux', 'Other'];
  console.log('\nSelect your Operating System:');
  osOptions.forEach((opt, i) => console.log(chalk.gray(`  ${i + 1}. ${opt}`)));
  const osChoice = await question('> ');
  const selectedOsKey = osOptions[parseInt(osChoice) - 1]?.toLowerCase() || 'other';

  let osSel, shellSel;

  if (selectedOsKey === 'other') {
    osSel = await question('Please enter your OS: ');
  } else {
    osSel = selectedOsKey;
  }

  console.log('\nEnter your default shell (e.g., bash, zsh, PowerShell):');
  shellSel = await question('> ');

  rl.close();
  await setConfig({ os: osSel, shell: shellSel });

  return { os: osSel, shell: shellSel };
};

async function getLatestVersion() {
  try {
    const res = await axios.get(`https://registry.npmjs.org/${NPM_PACKAGE_NAME}/latest`, { timeout: 4000 });
    return res.data.version;
  } catch (e) {
    return null;
  }
}

async function notifyIfUpdateAvailable() {
  const localVersion = packageJson.version;
  const latestVersion = await getLatestVersion();
  if (latestVersion && semver.gt(latestVersion, localVersion)) {
    console.log(chalk.yellow.bold('\n⚡️ New version available!'));
    console.log(chalk.yellow(`You are using v${localVersion}, but v${latestVersion} is available.`));
    console.log(chalk.yellow('For the best experience, run: ') + chalk.blue.bold('npm install -g ' + NPM_PACKAGE_NAME));
    console.log('');
  }
}

async function handleUpdate() {
  console.log(chalk.cyan('Checking for updates...'));
  const latestVersion = await getLatestVersion();
  if (!latestVersion) {
    console.log(chalk.red('Could not fetch latest version from npm. Please check your internet connection or try again later.'));
    gracefulExit();
    return;
  }
  if (semver.gte(packageJson.version, latestVersion)) {
    console.log(chalk.green('You are already using the latest version of CMDGEN.'));
    gracefulExit();
    return;
  }

  console.log(chalk.cyan(`Updating CMDGEN from v${packageJson.version} to v${latestVersion} ...`));
  try {
    // only npm
    const child = spawn('npm', ['install', '-g', NPM_PACKAGE_NAME], { stdio: 'inherit', shell: true });
    child.on('close', code => {
      if (code === 0) {
        console.log(chalk.green('\n✅ CMDGEN was successfully updated! Restart your terminal to use the new version.'));
      } else {
        console.log(chalk.red('\nUpdate failed. Please try running this command manually:'));
        console.log(chalk.blue.bold('npm install -g ' + NPM_PACKAGE_NAME));
      }
      gracefulExit();
    });
  } catch (e) {
    console.log(chalk.red('Update failed. Please run: npm install -g ' + NPM_PACKAGE_NAME));
    gracefulExit();
  }
}

async function handleDeleteInteractive() {
  console.log(chalk.red.bold('\n--- Uninstall CMDGEN ---'));

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const question = (query) => new Promise(resolve => rl.question(query, resolve));

  const confirm = await question(chalk.yellow('Are you sure you want to permanently delete CMDGEN and its config file? (y/N) '));
  if (confirm.toLowerCase() !== 'y') {
    console.log(chalk.gray('Uninstall cancelled.'));
    rl.close();
    return;
  }

  const reason = await question(chalk.yellow('(Optional) To help us improve, please share why you are uninstalling: '));
  if (reason.trim()) {
    try {
      const formData = new URLSearchParams();
      formData.append(UNINSTALL_REASON_ENTRY_ID, reason);
      axios.post(UNINSTALL_REASON_FORM_URL, formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }).catch(() => {});
    } catch (e) { /* Ignore errors */ }
  }
  rl.close();

  let configRemoved = false;
  let cmdgenRemoved = false;
  let removedFiles = [];
  let failedFiles = [];

  try {
    await fs.remove(configDir);
    configRemoved = true;
    console.log(chalk.gray('Removing configuration files...'));
  } catch (e) {}

  function tryRemoveFile(file) {
    if (!file) return false;
    try {
      if (fs.existsSync(file)) {
        fs.removeSync(file);
        removedFiles.push(file);
        return true;
      }
    } catch (e) {
      failedFiles.push(file);
    }
    return false;
  }

  let execPaths = [];
  if (process.platform === 'win32') {
    try {
      const res = execSync('where cmdgen', { encoding: 'utf8' });
      execPaths = res.split('\n').map(s => s.trim()).filter(Boolean);
    } catch (e) {}
  } else {
    try {
      const res = execSync('which cmdgen', { encoding: 'utf8' });
      execPaths = res.split('\n').map(s => s.trim()).filter(Boolean);
    } catch (e) {}
  }

  for (const file of execPaths) {
    if (tryRemoveFile(file)) {
      cmdgenRemoved = true;
    }
    if (process.platform === 'win32' && !file.endsWith('.cmd')) {
      const batchFile = file + '.cmd';
      if (tryRemoveFile(batchFile)) {
        cmdgenRemoved = true;
      }
    }
  }

  if (configRemoved || cmdgenRemoved) {
    console.log(chalk.green('✅ CMDGEN has been successfully uninstalled.'));
    if (removedFiles.length) {
      console.log(chalk.gray('Removed files:'));
      removedFiles.forEach(f => console.log(chalk.gray('  - ' + f)));
    }
    if (failedFiles.length) {
      console.log(chalk.yellow('Some files could not be removed automatically:'));
      failedFiles.forEach(f => console.log(chalk.yellow('  - ' + f)));
      console.log('You may need to remove them manually.');
    }
    console.log(chalk.gray('\nIf you installed via npm, you may also want to run: npm uninstall -g ' + NPM_PACKAGE_NAME));
  } else {
    console.log(chalk.red('Could not automatically remove all CMDGEN files. Please remove them manually.'));
  }
  console.log('You may need to restart your terminal for changes to take full effect.');
  gracefulExit();
}

async function run() {
  let config = await getConfig();
  const args = hideBin(process.argv);
  const command = args[0];

  // Print version support
  if (args.includes('-v') || args.includes('--version')) {
    console.log(packageJson.version);
    process.exit(0);
  }

  // Notify on updates (skip when running update)
  if (command !== 'update') {
    await notifyIfUpdateAvailable();
  }

  const needsConfig = !['config', 'update', 'delete', 'd', 'feedback', 'f', undefined, '--help', '-h', '--version', '-v'].includes(command);
  if (needsConfig && (!config.os || !config.shell)) {
    console.log(chalk.yellow('Welcome to CMDGEN! Let\'s get you set up first.'));
    config = await runSetupWizard();
    console.log(chalk.cyan('\nSetup complete! Now running your original command...'));
  }

  yargs(args)
    .scriptName("cmdgen")
    .help(false)
    .version(false)
    .option('h', { alias: 'help', type: 'boolean' })
    .option('v', { alias: 'version', type: 'boolean' })
    .command(['generate <request>', 'g'], 'Generate a single command', {}, async (argv) => {
      try {
        const res = await callApi({
          userInput: argv.request,
          mode: 'generate',
          cli: argv.shell || config.shell,
          os: argv.os || config.os,
          osVersion: argv.osVersion || '',
          lang: argv.lang || (config.lang || 'en'),
        });
        if (res?.data?.commands && Array.isArray(res.data.commands)) {
          for (const cmd of res.data.commands) {
            await addToHistory({ command: cmd.command, explanation: cmd.explanation });
          }
          printCommandResult(res.data.commands);
          await incrementUsageCount();
        } else {
          console.log(chalk.red('No commands returned. Try again or check your OPENAI_API_KEY and network.'));
        }
      } catch (err) {
        console.error(chalk.red('Error generating commands:'), err.message || err);
      }
    })
    .command(['script <request>', 's'], 'Generate a full script', {}, async (argv) => {
      try {
        const res = await callApi({
          userInput: argv.request,
          mode: 'script',
          cli: argv.shell || config.shell,
          os: argv.os || config.os,
          osVersion: argv.osVersion || '',
          lang: argv.lang || (config.lang || 'en'),
        });
        if (res?.data?.script) {
          await addToHistory({ command: res.data.script, explanation: res.data.explanation || '' });
          printScriptResult(res.data.script, res.data.explanation || '');
          await incrementUsageCount();
        } else {
          console.log(chalk.red('No script returned. Try again.'));
        }
      } catch (err) {
        console.error(chalk.red('Error generating script:'), err.message || err);
      }
    })
    .command(['analyze <command>', 'a'], 'Understand what a command does', {}, async (argv) => {
      try {
        const res = await callApi({
          userInput: argv.command,
          mode: 'analyze',
          cli: argv.shell || config.shell,
          os: argv.os || config.os,
          osVersion: argv.osVersion || '',
          lang: argv.lang || (config.lang || 'en'),
        });
        if (res?.data?.explanation) {
          await addToHistory({ command: argv.command, explanation: res.data.explanation });
          printAnalyzeResult(argv.command, res.data.explanation);
          await incrementUsageCount();
        } else {
          console.log(chalk.red('Could not analyze the command.'));
        }
      } catch (err) {
        console.error(chalk.red('Error analyzing command:'), err.message || err);
      }
    })
    .command(['error <message>', 'e'], 'Help with an error message', {}, async (argv) => {
      try {
        const res = await callApi({
          userInput: argv.message,
          mode: 'error',
          cli: argv.shell || config.shell,
          os: argv.os || config.os,
          osVersion: argv.osVersion || '',
          lang: argv.lang || (config.lang || 'en'),
        });
        if (res?.data?.help) {
          printErrorHelp(argv.message, res.data.help);
          await incrementUsageCount();
        } else {
          console.log(chalk.red('Could not provide help for this error.'));
        }
      } catch (err) {
        console.error(chalk.red('Error analyzing error message:'), err.message || err);
      }
    })
    .command(['history'], 'Show recently generated commands', {}, async () => {
      const cfg = await getConfig();
      const history = cfg.history || [];
      if (!history.length) {
        console.log(chalk.yellow('No command history found.'));
        return;
      }
      console.log(chalk.cyan.bold('--- Command History ---'));
      history.forEach((item, index) => {
        const isScript = item.command.includes('\n');
        console.log(`\n${chalk.cyan.bold(`#${index + 1}`)}: ${item.explanation}`);
        if (isScript) {
          console.log(chalk.green('--- SCRIPT START ---'));
          console.log(chalk.gray(item.command));
          console.log(chalk.green('--- SCRIPT END ---'));
        } else {
          console.log(`  ${chalk.green(item.command)}`);
        }
      });
    })
    .command(['feedback', 'f'], 'Provide feedback about CMDGEN', {}, async () => {
      await handleFeedback(true);
      gracefulExit();
    })
    .command(['update'], 'Update CMDGEN to the latest version', {}, async () => {
      await handleUpdate();
    })
    .command(['delete', 'd'], 'Uninstall cmdgen from your system', {}, async () => {
      await handleDeleteInteractive();
    })
    .command('config [action] [key] [value]', 'Manage saved settings', {}, async (argv) => {
      if (argv.action === 'show') {
        const cfg = await getConfig();
        console.log(JSON.stringify(cfg, null, 2));
      } else if (argv.action === 'wizard') {
        await runSetupWizard();
      } else if (argv.action === 'set' && argv.key && argv.value) {
        const cfg = await getConfig();
        cfg[argv.key] = argv.value;
        await setConfig(cfg);
        console.log(chalk.green('Config updated.'));
      } else {
        console.log(chalk.yellow('Usage: cmdgen config [show|set <key> <value>|wizard]'));
      }
    })
    .parse();
}

run().catch(err => {
  console.error(chalk.red(`\nA critical error occurred: ${err.message || err}`));
  if (err && err.stack) console.error(err.stack);
  process.exit(1);
});