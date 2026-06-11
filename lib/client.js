const net = require('net');
const readline = require('readline');
const { Writable } = require('stream');
const config = require('../config.js');
require('colors');

const os = require('os');
const path = require('path');
const SOCKET_PATH = process.platform === 'win32'
    ? `\\\\.\\pipe\\manager-cli-${Buffer.from(os.userInfo().username).toString('hex')}`
    : path.join(os.homedir(), '.manager-cli', 'data.sock');
const orange = str => `\x1b[38;5;208m${str}\x1b[0m`;
const orangeBold = str => `\x1b[38;5;208;1m${str}\x1b[0m`;

let socket;

// Mock core for UI compatibility
const core = {
    config: config,
    logs: {},
    processes: {}, // Not used in client
    allApps: [],
    state: {
        currentView: 'MENU',
        currentProjectLog: null,
        currentPage: 0,
        helpPage: 0,
        currentWorkspaceIdx: 0,
        currentErrorMessage: '',
        ITEMS_PER_PAGE: 8,
        frameIdx: 0,
        spinnerFrames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
    },
    isHeadless: process.argv.length > 2,

    log: function(prefix, msg) {
        if (this.isHeadless) {
            console.log(`[${prefix.toUpperCase().cyan}] ${msg}`);
        }
    },

    rebuildAppsList: function() {
        // UI re-reading config
        this.allApps.length = 0;
        this.config.workspaces.forEach(ws => {
            ws.apps.forEach(app => {
                app.workspace = ws.name;
                this.allApps.push(app);
            });
        });
        if (socket && !socket.destroyed) {
            socket.write(JSON.stringify({ type: 'RELOAD_CONFIG' }) + '\n');
        }
    },

    analyzeProject: function(project) {
        // UI just adds defaults, daemon does real analyze
        project.actualPort = project.port;
        project.type = project.type || 'next';
        project.status = project.status || 'OFFLINE'; 
        project.hasError = project.hasError || false;
    },

    startSingleProject: async function(project, isCLI = true) {
        if (socket && !socket.destroyed) {
            socket.write(JSON.stringify({ type: 'START', project: project.name }) + '\n');
        }
    },

    stopProject: async function(project) {
        if (socket && !socket.destroyed) {
            socket.write(JSON.stringify({ type: 'STOP', project: project.name }) + '\n');
        }
    },

    restartProject: async function(project) {
        if (socket && !socket.destroyed) {
            socket.write(JSON.stringify({ type: 'RESTART', project: project.name }) + '\n');
        }
    },

    killAllAndExit: async function() {
        process.stdout.write('\x1B[2J\x1B[3J\x1B[H');
        console.log(orange('\nCLI detached. The daemon and all projects are still running.').bold);
        console.log(orange('Use `manager-app-cli` to reconnect.\n'));
        process.exit(0);
    },

    shutdownDaemon: async function() {
        const t = this.config.i18n[this.config.settings.lang] || this.config.i18n['en'];
        process.stdout.write('\x1B[2J\x1B[3J\x1B[H');
        console.log(orange(`\n${t.exitMsg}`));
        
        if (socket && !socket.destroyed) {
            socket.write(JSON.stringify({ type: 'KILL_ALL' }) + '\n');
        }
        
        setTimeout(() => {
            console.log(`${t.exitDone}`.green.bold);
            process.exit(0);
        }, 1000);
    }
};

core.rebuildAppsList();
core.allApps.forEach(app => core.analyzeProject(app));

const consoleManager = require('./consoleManager.js')(core);
const commandManager = require('./commandManager.js')(core, consoleManager);

const mutableStdout = new Writable({
    write(chunk, encoding, callback) {
        if (core.state.currentView === 'LOGS') {
            process.stdout.write(chunk);
        }
        callback();
    }
});

const rl = readline.createInterface({
    input: process.stdin,
    output: mutableStdout,
    terminal: true,
    completer: commandManager.completer
});

consoleManager.setRl(rl);

function startUI() {
    consoleManager.fullClear();

    setInterval(() => {
        core.state.frameIdx = (core.state.frameIdx + 1) % core.state.spinnerFrames.length;
        if (core.state.currentView !== 'LOGS') consoleManager.showMenu();
    }, 100);

    readline.emitKeypressEvents(process.stdin);
    process.stdin.on('keypress', () => {
        if (core.state.currentView !== 'LOGS') {
            setTimeout(consoleManager.showMenu, 5);
        }
    });

    rl.on('line', commandManager.handleLine);

    rl.on('SIGINT', () => {
        // Just detach from daemon on SIGINT, don't kill daemon!
        const t = core.config.i18n[core.config.settings.lang] || core.config.i18n['en'];
        process.stdout.write('\x1B[2J\x1B[3J\x1B[H');
        console.log(orange('\nClient detached. The daemon is still running in the background.').bold);
        console.log(orange('Use `manager-app-cli` to reconnect.\n'));
        process.exit(0);
    });
}

function connectToDaemon(headlessArgs = null) {
    socket = net.createConnection({ path: SOCKET_PATH }, () => {
        // Connected to daemon
        // Connection handling now wait for initial STATE
        if (!headlessArgs) {
            startUI();
        }
    });

    let buffer = '';
    socket.on('data', async (data) => {
        buffer += data.toString();
        let parts = buffer.split('\n');
        buffer = parts.pop();

        for (const part of parts) {
            try {
                const msg = JSON.parse(part);
                if (msg.type === 'STATE') {
                    // Map state to local apps
                    msg.apps.forEach(daemonApp => {
                        const localApp = core.allApps.find(a => a.name === daemonApp.name);
                        if (localApp) {
                            localApp.status = daemonApp.status;
                            localApp.hasError = daemonApp.hasError;
                            localApp.actualPort = daemonApp.port;
                        } else {
                            core.allApps.push(daemonApp);
                        }
                    });
                    
                    if (headlessArgs) {
                        // Wait for state to sync before executing the command
                        await commandManager.handleLine(headlessArgs);
                        // Exit cleanly with newlines so the console doesn't bug out
                        setTimeout(() => {
                            console.log('\n');
                            process.exit(0);
                        }, 100);
                        headlessArgs = null;
                    } else if (!core.isHeadless) {
                        if (core.state.currentView !== 'LOGS') consoleManager.showMenu();
                    }
                } 
                else if (msg.type === 'LOG') {
                    const { project, log } = msg;
                    if (!core.logs[project]) core.logs[project] = [];
                    core.logs[project].push(log);
                    if (core.logs[project].length > 500) core.logs[project].shift();

                    if (core.state.currentView === 'LOGS' && core.state.currentProjectLog === project) {
                        process.stdout.write(log);
                    }
                }
                else if (msg.type === 'FULL_LOGS') {
                    core.logs = msg.logs;
                }
            } catch (e) {}
        }
    });

    socket.on('error', (err) => {
        console.error("Connection to daemon lost:", err.message);
        process.exit(1);
    });
    
    socket.on('end', () => {
        if (!headlessArgs) {
            console.log("\nDaemon disconnected.".red);
        }
        process.exit(0);
    });
}

const isCLI = process.argv.length > 2;
if (isCLI) {
    const headlessArgsArr = process.argv.slice(2).map(arg => arg.includes(' ') ? `"${arg}"` : arg);
    connectToDaemon(headlessArgsArr.join(' '));
} else {
    connectToDaemon();
}
