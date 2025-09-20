#!/usr/bin/env node

// --- DOTENV SETUP (MUST BE AT THE VERY TOP) ---
const path = require('path');
const envPath = process.pkg
  ? path.join(path.dirname(process.execPath), '.env')
  : path.join(__dirname, '.env');
require('dotenv').config({ path: envPath });
// --- END DOTENV SETUP ---

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const axios = require('axios/dist/node/axios.cjs');
// --- UPDATED: Import spawn instead of exec ---
const { spawn, execSync } = require('child_process');
const { TextDecoder } = require('util');
const os = require('os');
const { getSystemPrompt } = require('./apiService-cli.js');
const { parseAndConstructData } = require('./responseParser-cli.js');
const packageJson = require('./package.json');
const readline = require('readline');
const { app } = require('./server.js');

// --- OS & System Info Detection ---
const getSystemInfo = () => { /* ... unchanged ... */ };

// --- Banner and Info ---
const showBanner = () => { /* ... unchanged ... */ };

// --- Server Management ---
const serverPort = 3003;
const serverHost = '127.0.0.1';
const serverUrl = `http://${serverHost}:${serverPort}`;

// --- Core API ---
const callApi = async ({ mode, userInput, os, osVersion, cli, lang, options = {} }) => { /* ... unchanged ... */ };

// --- Interactive Prompt ---
const promptForChoice = (commands, onExecute, onMore, onQuit) => { /* ... unchanged ... */ };

// --- UPDATED: Smart Command Execution with spawn ---
const executeCommand = (command) => {
    return new Promise((resolve) => {
        const commandToExecute = command.command;
        console.log(`\n🚀 Executing: ${commandToExecute}`);

        // Using spawn for interactive and robust command execution
        const child = spawn(commandToExecute, [], {
            // 'inherit' connects the child process to the parent's terminal
            stdio: 'inherit',
            // 'shell: true' allows us to run complex commands with pipes, etc.
            shell: true
        });

        child.on('close', (code) => {
            if (code !== 0) {
                console.error(`\n❌ Process exited with code ${code}`);
            }
            resolve();
        });

        child.on('error', (err) => {
            console.error(`\n❌ Failed to start process:\n${err.message}`);
            resolve();
        });
    });
};


// --- Yargs Command Parser ---
const run = async () => {
    // ... (The rest of the run function is the same as the last version) ...
};

run();
