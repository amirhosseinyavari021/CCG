const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const configDir = path.join(os.homedir(), '.cmdgen');
const configFile = path.join(configDir, 'config.json');
const historyFile = path.join(configDir, 'history.json');
const MAX_HISTORY = 20;

// Generate session ID for this CLI session
const SESSION_ID = crypto.randomBytes(8).toString('hex');

async function getConfig() {
    await fs.ensureDir(configDir);
    if (await fs.pathExists(configFile)) {
        try {
            const config = await fs.readJson(configFile);
            if (!config.history) config.history = [];
            if (config.usageCount === undefined) config.usageCount = 0;
            if (config.feedbackRequested === undefined) config.feedbackRequested = false;
            if (!config.sessionStats) config.sessionStats = {};
            return config;
        } catch (error) {
            console.error('Warning: Configuration file was corrupted and has been reset.');
            await fs.remove(configFile);
            return { history: [], usageCount: 0, feedbackRequested: false, sessionStats: {} };
        }
    }
    return { history: [], usageCount: 0, feedbackRequested: false, sessionStats: {} };
}

async function setConfig(newConfig) {
    const currentConfig = await getConfig();
    await fs.writeJson(configFile, { ...currentConfig, ...newConfig });
}

//