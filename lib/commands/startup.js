const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

function ensureSystemDaemon() {
    if (process.platform !== 'linux') return;
    try {
        const systemdDir = path.join(os.homedir(), '.config', 'systemd', 'user');
        const serviceFile = path.join(systemdDir, 'manager-cli.service');
        if (fs.existsSync(serviceFile)) return;

        if (!fs.existsSync(systemdDir)) {
            fs.mkdirSync(systemdDir, { recursive: true });
        }

        const nodePath = process.execPath;
        const daemonJsPath = path.resolve(__dirname, '..', 'daemon.js');

        const serviceContent = `[Unit]
Description=Manager CLI Daemon
After=network.target

[Service]
Type=simple
ExecStart=${nodePath} ${daemonJsPath}
Restart=always
RestartSec=10

[Install]
WantedBy=default.target`;

        fs.writeFileSync(serviceFile, serviceContent);

        try {
            execSync(`loginctl enable-linger ${os.userInfo().username}`, { stdio: 'ignore' });
            execSync('systemctl --user daemon-reload', { stdio: 'ignore' });
            execSync('systemctl --user enable manager-cli.service', { stdio: 'ignore' });
            execSync('systemctl --user start manager-cli.service', { stdio: 'ignore' });
        } catch (e) {}
    } catch (e) {}
}

module.exports = {
    name: 'startup',
    description: 'Toggle auto-start on daemon boot',
    execute: async (args, core, consoleManager) => {
        ensureSystemDaemon();
        
        if (args.length < 2) {
            const msg = "Usage: /startup <id|name|all> <on|off>";
            if (consoleManager && !core.isHeadless) consoleManager.showError(msg);
            else core.log('startup', msg);
            return;
        }

        const identifier = args[0];
        const state = args[1].toLowerCase();

        if (identifier.toLowerCase() === 'all') {
            let changed = 0;
            core.config.workspaces.forEach(ws => {
                ws.apps.forEach(app => {
                    app.startup = (state === 'on');
                    const targetApp = core.allApps.find(a => a.name === app.name);
                    if (targetApp) targetApp.startup = app.startup;
                    changed++;
                });
            });
            core.config.saveWorkspaces();
            
            if (consoleManager && !core.isHeadless) {
                consoleManager.fullClear();
                consoleManager.showMenu();
            } else {
                core.log('startup', `Startup for all ${changed} projects set to ${state.toUpperCase()}`);
            }
            return;
        }

        const resolveProject = (id_or_name) => {
            const id = parseInt(id_or_name, 10);
            if (!isNaN(id) && id >= 0 && id < core.allApps.length) {
                return core.allApps[id];
            }
            return core.allApps.find(p => p.name === id_or_name);
        };

        const targetApp = resolveProject(identifier);
        if (!targetApp) {
            const msg = `Project ${identifier} not found.`;
            if (consoleManager && !core.isHeadless) consoleManager.showError(msg);
            else core.log('startup', msg);
            return;
        }

        const ws = core.config.workspaces.find(w => w.name === targetApp.workspace);
        if (ws) {
            const app = ws.apps.find(a => a.name === targetApp.name);
            if (app) {
                app.startup = (state === 'on');
                targetApp.startup = app.startup;
                core.config.saveWorkspaces();
                
                if (consoleManager && !core.isHeadless) {
                    consoleManager.fullClear();
                    consoleManager.showMenu();
                } else {
                    core.log('startup', `Startup for ${targetApp.name} set to ${app.startup ? 'ON' : 'OFF'}`);
                }
            }
        }
    }
};
