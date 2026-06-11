const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const os = require('os');
require('colors');

const config = require('../config.js');

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

const SOCKET_PATH = isWindows
    ? `\\\\.\\pipe\\manager-cli-${Buffer.from(os.userInfo().username).toString('hex')}`
    : path.join(os.homedir(), '.manager-cli', 'data.sock');

const core = {
    config: config,
    logs: {},
    processes: {},
    allApps: [],
    clients: new Set(),

    getLogPaths: function(projectName) {
        const logsDir = path.join(os.homedir(), '.manager-cli', 'logs', projectName);
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }
        return {
            success: path.join(logsDir, 'success.log'),
            error: path.join(logsDir, 'error.log')
        };
    },

    writeToLogFile: function(projectName, text, isError) {
        try {
            const paths = this.getLogPaths(projectName);
            const targetFile = isError ? paths.error : paths.success;
            const cleanText = text.replace(/\x1b\[[0-9;]*m/g, '');
            fs.appendFileSync(targetFile, cleanText);
        } catch (e) {}
    },

    rebuildAppsList: function() {
        this.allApps.length = 0;
        this.config.workspaces.forEach(ws => {
            ws.apps.forEach(app => {
                app.workspace = ws.name;
                this.allApps.push(app);
            });
        });
    },

    analyzeProject: function(project) {
        project.actualPort = project.port;
        project.portSource = 'Fallback';
        project.type = project.type || 'next';
        project.status = project.status || 'OFFLINE'; 
        project.hasError = project.hasError || false;    
        project.intentionalStop = project.intentionalStop || false;

        if (project.type === 'next') {
            project.needsPortArg = true;
            const pkgPath = path.join(project.path, 'package.json');
            try {
                if (fs.existsSync(pkgPath)) {
                    const pkgData = fs.readFileSync(pkgPath, 'utf8');
                    const pkg = JSON.parse(pkgData);
                    if (pkg.scripts && pkg.scripts.dev) {
                        const portMatch = pkg.scripts.dev.match(/-p\s*=?\s*(\d+)/);
                        if (portMatch) {
                            project.actualPort = parseInt(portMatch[1], 10);
                            project.needsPortArg = false;
                            project.portSource = 'package.json';
                        }
                    }
                }
            } catch (error) {}
        } 
        else if (project.type === 'express') {
            project.needsPortArg = false;
            const envPath = path.join(project.path, '.env');
            try {
                if (fs.existsSync(envPath)) {
                    const envData = fs.readFileSync(envPath, 'utf8');
                    const portMatch = envData.match(/PORT\s*=\s*"?(\d+)"?/);
                    if (portMatch) {
                        project.actualPort = parseInt(portMatch[1], 10);
                        project.portSource = '.env';
                    }
                }
            } catch (error) {}
        }
    },

    killPort: function(port) {
        return new Promise(resolve => {
            if (!port) return resolve();
            const done = () => setTimeout(resolve, 1500);

            if (isWindows) {
                exec(`netstat -ano | findstr :${port}`, (err, stdout) => {
                    if (!stdout) return done();
                    const pids = [...new Set(stdout.trim().split('\n').map(l => l.trim().split(/\s+/).pop()).filter(p => p && p !== '0'))];
                    if (!pids.length) return done();
                    exec(`taskkill /F /PID ${pids.join(' /PID ')}`, done);
                });
            } else {
                exec(`ss -lptn 'sport = :${port}'`, (err, stdout) => {
                    let pids = [];
                    if (stdout) {
                        const matches = stdout.match(/pid=(\d+)/g);
                        if (matches) pids = matches.map(m => m.split('=')[1]);
                    }
                    if (pids.length) {
                        exec(`kill -9 ${pids.join(' ')}`, () => done());
                    } else {
                        exec(`fuser -k -9 ${port}/tcp`, () => {
                            exec(`lsof -t -i:${port}`, (err2, stdout2) => {
                                if (stdout2) {
                                    const lsofPids = stdout2.trim().split('\n').filter(Boolean);
                                    if (lsofPids.length) {
                                        exec(`kill -9 ${lsofPids.join(' ')}`, done);
                                        return;
                                    }
                                }
                                done();
                            });
                        });
                    }
                });
            }
        });
    },

    broadcastState: function() {
        const stateMsg = JSON.stringify({
            type: 'STATE',
            apps: this.allApps.map(app => ({
                name: app.name,
                workspace: app.workspace,
                status: app.status,
                hasError: app.hasError,
                port: app.actualPort,
                type: app.type
            }))
        }) + '\n';

        this.clients.forEach(client => {
            try { client.write(stateMsg); } catch(e) {}
        });
    },

    broadcastLog: function(project, log) {
        const logMsg = JSON.stringify({ type: 'LOG', project, log }) + '\n';
        this.clients.forEach(client => {
            try { client.write(logMsg); } catch(e) {}
        });
    },

    stopProject: async function(project) {
        project.intentionalStop = true;
        const oldProcess = this.processes[project.name];
        if (oldProcess) {
            oldProcess.removeAllListeners('close');
            oldProcess.removeAllListeners('error');
            oldProcess.stdout.removeAllListeners('data');
            oldProcess.stderr.removeAllListeners('data');
            if (!oldProcess.killed) oldProcess.kill();
        }
        if (project.actualPort) {
            await this.killPort(project.actualPort);
        }
        project.status = 'OFFLINE';
        project.hasError = false;
        this.logs[project.name] = this.logs[project.name] || [];
        this.logs[project.name].push('\n[SYSTEM] PROZESS MANUELL GESTOPPT\n'.yellow);
        this.writeToLogFile(project.name, '\n[SYSTEM] PROZESS MANUELL GESTOPPT\n', false);
        
        this.broadcastLog(project.name, '\n[SYSTEM] PROZESS MANUELL GESTOPPT\n'.yellow);
        this.broadcastState();
    },

    getChildArgs: function(project) {
        let cmd, args;
        if (project.command && Array.isArray(project.command)) {
            cmd = project.command[0];
            args = project.command.slice(1);
        } else if (project.type === 'express') {
            cmd = 'node';
            args = ['.'];
        } else {
            cmd = npmCmd;
            args = ['run', 'dev'];
        }

        if (project.type === 'next' && project.needsPortArg) {
            args.push('--', '-p', project.actualPort);
        }
        return { cmd, args };
    },

    startSingleProject: async function(project) {
        project.intentionalStop = false;
        project.status = 'STARTING';
        this.logs[project.name] = this.logs[project.name] || []; 
        this.broadcastState();
        
        if (!fs.existsSync(project.path)) {
            const errStr = `\n[SYSTEM] FEHLER: Der Ordner '${project.path}' existiert nicht!\n`;
            this.logs[project.name].push(errStr.red);
            this.writeToLogFile(project.name, errStr, true);
            project.status = 'ERROR';
            project.hasError = true;
            this.broadcastLog(project.name, errStr);
            this.broadcastState();
            return; 
        }

        if (this.config.settings.autoKillPorts && project.actualPort) {
            await this.killPort(project.actualPort);
        }

        const { cmd, args } = this.getChildArgs(project);
        const child = spawn(cmd, args, { cwd: project.path });
        this.processes[project.name] = child;
        
        setTimeout(() => {
            if (project.status === 'STARTING' && !project.intentionalStop) {
                try {
                    process.kill(child.pid, 0); // Throws if PID doesn't exist
                    project.status = 'ONLINE';
                    this.broadcastState();
                } catch (e) {}
            }
        }, 3000);

        const handleOutput = (data, isErrorStream) => {
            if (project.intentionalStop) return;

            const text = data.toString();
            const lowerText = text.toLowerCase();
            const logEntry = isErrorStream ? text.red : text;
            
            this.logs[project.name].push(logEntry);
            if (this.logs[project.name].length > 500) this.logs[project.name].shift();

            this.writeToLogFile(project.name, text, isErrorStream);
            this.broadcastLog(project.name, logEntry);

            let statusChanged = false;
            if (lowerText.includes('error') || lowerText.includes('err_')) {
                project.hasError = true;
                project.status = 'ERROR';
                statusChanged = true;
            }
            if (statusChanged) this.broadcastState();
        };

        child.stdout.on('data', (data) => handleOutput(data, false));
        child.stderr.on('data', (data) => handleOutput(data, true)); 

        child.on('close', (code) => {
            if (!project.intentionalStop) {
                const logEntry = `\n[PROZESS BEENDET] mit Code ${code}\n`;
                this.logs[project.name].push(logEntry.bgRed.white);
                this.writeToLogFile(project.name, logEntry, true);
                project.status = (code === 0 || code === null) ? 'OFFLINE' : 'CRASHED';
                project.hasError = (code !== 0 && code !== null);
                
                this.broadcastLog(project.name, logEntry);
                this.broadcastState();
            }
        });
        
        child.on('error', (err) => {
            if (project.intentionalStop) return;
            const logEntry = `\n[SYSTEM] FEHLER beim Starten von ${project.name}: ${err.message}\n`;
            this.logs[project.name].push(logEntry.red);
            this.writeToLogFile(project.name, logEntry, true);
            project.status = 'ERROR';
            project.hasError = true;
            
            this.broadcastLog(project.name, logEntry);
            this.broadcastState();
        });
    },

    killAllAndExit: async function() {
        Object.values(this.processes).forEach(child => {
            if (!child.killed) child.kill();
        });

        const portPromises = this.allApps
            .filter(app => app.actualPort)
            .map(app => this.killPort(app.actualPort));
            
        await Promise.all(portPromises);
        process.exit(0);
    }
};

core.rebuildAppsList();
core.allApps.forEach(app => core.analyzeProject(app));

// TCP Server
const server = net.createServer((socket) => {
    core.clients.add(socket);

    // Send initial state
    const stateMsg = JSON.stringify({
        type: 'STATE',
        apps: core.allApps.map(app => ({
            name: app.name,
            workspace: app.workspace,
            status: app.status,
            hasError: app.hasError,
            port: app.actualPort,
            type: app.type
        }))
    }) + '\n';
    socket.write(stateMsg);

    // Send recent logs
    const fullLogsMsg = JSON.stringify({
        type: 'FULL_LOGS',
        logs: core.logs
    }) + '\n';
    socket.write(fullLogsMsg);

    let buffer = '';
    socket.on('data', async (data) => {
        buffer += data.toString();
        let parts = buffer.split('\n');
        buffer = parts.pop();

        for (const part of parts) {
            try {
                const msg = JSON.parse(part);
                if (msg.type === 'START' && msg.project) {
                    const p = core.allApps.find(a => a.name === msg.project);
                    if (p) core.startSingleProject(p);
                } else if (msg.type === 'STOP' && msg.project) {
                    const p = core.allApps.find(a => a.name === msg.project);
                    if (p) await core.stopProject(p);
                } else if (msg.type === 'RESTART' && msg.project) {
                    const p = core.allApps.find(a => a.name === msg.project);
                    if (p) {
                        await core.stopProject(p);
                        core.startSingleProject(p);
                    }
                } else if (msg.type === 'KILL_ALL') {
                    await core.killAllAndExit();
                } else if (msg.type === 'RELOAD_CONFIG') {
                    // Save existing app states
                    const oldStates = {};
                    core.allApps.forEach(app => {
                        oldStates[app.name] = {
                            status: app.status,
                            actualPort: app.actualPort,
                            hasError: app.hasError,
                            intentionalStop: app.intentionalStop
                        };
                    });

                    // Re-read config.json dynamically
                    const newWorkspaces = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.manager-cli', 'config.json'), 'utf8'));
                    core.config.workspaces = newWorkspaces;
                    core.rebuildAppsList();
                    
                    core.allApps.forEach(app => {
                        core.analyzeProject(app);
                        if (oldStates[app.name]) {
                            app.status = oldStates[app.name].status;
                            app.actualPort = oldStates[app.name].actualPort;
                            app.hasError = oldStates[app.name].hasError;
                            app.intentionalStop = oldStates[app.name].intentionalStop;
                        }
                    });
                    
                    core.broadcastState();
                }
            } catch (err) {
                console.error("IPC Parse Error:", err);
            }
        }
    });

    socket.on('end', () => core.clients.delete(socket));
    socket.on('error', () => core.clients.delete(socket));
});

if (fs.existsSync(SOCKET_PATH)) {
    try { fs.unlinkSync(SOCKET_PATH); } catch (e) {}
}

server.listen(SOCKET_PATH, () => {
    console.log(`Daemon running on Unix socket ${SOCKET_PATH}`);
    
    // Auto-start apps
    core.allApps.forEach(app => {
        if (app.startup === true) {
            core.startSingleProject(app);
        }
    });
});

process.on('SIGINT', () => core.killAllAndExit());
process.on('SIGTERM', () => core.killAllAndExit());
