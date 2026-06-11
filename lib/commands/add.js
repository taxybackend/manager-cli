const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'add',
    description: 'Add a new project (auto-detects JS/Python/Java)',
    execute: async (args, core, consoleManager) => {
        if (args.length === 0) {
            const msg = "Usage: /add <file_or_path> [-name <name>] [-command <command>]";
            if (consoleManager && !core.isHeadless) consoleManager.showError(msg);
            else core.log('add', msg);
            return;
        }

        let targetPath = args[0];
        let name = '';
        let commandStr = '';

        // If the first argument is a flag, assume current directory
        if (targetPath.startsWith('-')) {
            targetPath = process.cwd();
        } else {
            args.shift();
        }

        const absPath = path.resolve(targetPath);
        const stats = fs.existsSync(absPath) ? fs.statSync(absPath) : null;
        const projPath = stats && stats.isFile() ? path.dirname(absPath) : absPath;
        
        for (let i = 0; i < args.length; i++) {
            if (args[i] === '-name' && args[i+1]) {
                name = args[i+1];
                i++;
            } else if (args[i] === '-command' && args[i+1]) {
                commandStr = args[i+1];
                i++;
            }
        }

        if (!name) {
            name = path.basename(projPath) || 'unnamed-project';
        }

        let type = 'custom';
        let port = null;

        if (!commandStr) {
            // Auto-detect language
            const pkgPath = path.join(projPath, 'package.json');
            
            if (stats && stats.isFile() && absPath.endsWith('.js')) {
                type = 'custom';
                commandStr = `node ${path.basename(absPath)}`;
            } else if (stats && stats.isFile() && absPath.endsWith('.py')) {
                type = 'python';
                commandStr = `python3 ${path.basename(absPath)}`;
            } else if (stats && stats.isFile() && absPath.endsWith('.sh')) {
                type = 'custom';
                commandStr = `bash ${path.basename(absPath)}`;
            } else if (stats && stats.isFile() && absPath.endsWith('.php')) {
                type = 'custom';
                commandStr = `php ${path.basename(absPath)}`;
            } else if (fs.existsSync(pkgPath)) {
                try {
                    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
                    const devCmd = pkg.scripts && pkg.scripts.dev;
                    const startCmd = pkg.scripts && pkg.scripts.start;
                    
                    if ((devCmd && devCmd.includes('next')) || (startCmd && startCmd.includes('next'))) {
                        type = 'next';
                        commandStr = "npm run dev";
                    } else if (devCmd) {
                        type = 'custom';
                        commandStr = "npm run dev";
                    } else if (startCmd) {
                        type = 'custom';
                        commandStr = "npm start";
                    } else {
                        type = 'custom';
                        commandStr = "node index.js";
                    }
                } catch (e) {
                    type = 'custom';
                    commandStr = "node index.js";
                }
            } else if (fs.existsSync(path.join(projPath, 'pom.xml'))) {
                type = 'java';
                commandStr = "mvn spring-boot:run";
                port = 8080;
            } else if (fs.existsSync(path.join(projPath, 'requirements.txt')) || fs.existsSync(path.join(projPath, 'main.py'))) {
                type = 'python';
                commandStr = "python3 main.py";
                port = 5000;
            } else {
                type = 'custom';
                commandStr = "node index.js";
            }
        } else {
            type = 'custom';
        }

        const activeWs = core.config.workspaces[core.state.currentWorkspaceIdx];

        if (activeWs.apps.find(a => a.name === name)) {
            const msg = `Project ${name} already exists.`;
            if (consoleManager && !core.isHeadless) consoleManager.showError(msg);
            else core.log('add', msg);
            return;
        }

        const newProj = {
            name,
            path: projPath,
            type,
            port,
            command: commandStr ? commandStr.split(' ') : undefined
        };
        activeWs.apps.push(newProj);
        core.config.saveWorkspaces();
        core.rebuildAppsList();
        
        // Analyze defaults and auto-start
        const targetProject = core.allApps.find(a => a.name === name);
        core.analyzeProject(targetProject);
        
        await core.startSingleProject(targetProject, true);
        
        if (consoleManager && !core.isHeadless) {
            const currentApps = core.allApps.filter(a => a.workspace === activeWs.name);
            core.state.currentPage = Math.floor((currentApps.length - 1) / core.state.ITEMS_PER_PAGE);
            core.state.currentView = 'MENU';
            consoleManager.fullClear();
            consoleManager.showMenu();
        } else {
            const padStr = (str, len) => (str + ' '.repeat(len)).substring(0, len);
            const cmdText = commandStr || 'Auto-detect';
            
            console.log('\n\x1b[90m╭──────────────────────────────────────────╮\x1b[0m');
            console.log('\x1b[90m│\x1b[0m  \x1b[32m✔ PROJECT ADDED AND STARTED\x1b[0m             \x1b[90m│\x1b[0m');
            console.log('\x1b[90m├──────────────────────────────────────────┤\x1b[0m');
            console.log(`\x1b[90m│\x1b[0m  Name:    \x1b[37;1m${padStr(name, 30)}\x1b[0m \x1b[90m│\x1b[0m`);
            console.log(`\x1b[90m│\x1b[0m  Type:    \x1b[37m${padStr(type.toUpperCase(), 30)}\x1b[0m \x1b[90m│\x1b[0m`);
            console.log(`\x1b[90m│\x1b[0m  Command: \x1b[37m${padStr(cmdText, 30)}\x1b[0m \x1b[90m│\x1b[0m`);
            if (port) {
                console.log(`\x1b[90m│\x1b[0m  Port:    \x1b[37m${padStr(port.toString(), 30)}\x1b[0m \x1b[90m│\x1b[0m`);
            }
            console.log('\x1b[90m╰──────────────────────────────────────────╯\x1b[0m\n');
        }
    }
};
