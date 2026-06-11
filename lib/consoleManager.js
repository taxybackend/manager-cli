require('colors');
const readLineMod = require('readline');

module.exports = function(core) {
    let rl = null;

    const primary = str => `\x1b[37;1m${str}\x1b[0m`; // White bold
    const b = str => `\x1b[90m${str}\x1b[0m`; // Dark grey border
    const stripAnsi = str => str.replace(/\x1b\[[0-9;]*m/g, '');
    const getVisibleLen = str => {
        let clean = stripAnsi(str);
        clean = clean.replace(/🟢|🔴|⚪|🟡|⚡|⏹️/g, '--');
        return clean.length;
    };
    const pad = (str, len) => str + ' '.repeat(Math.max(0, len - getVisibleLen(str)));

    function fullClear() {
        process.stdout.write('\x1B[2J\x1B[3J\x1B[H');
    }

    function showMenu() {
        if (core.state.currentView === 'LOGS') return; 

        const t = core.config.i18n[core.config.settings.lang] || core.config.i18n['en'];
        let out = '';
        
        out += b('╭' + '─'.repeat(88) + '╮\n');
        
        // Header
        out += b('│') + pad('  ⚡ ' + primary('MANAGER-CLI'), 88) + b('│\n');
        out += b('├' + '─'.repeat(88) + '┤\n');

        const midLines = [];
        const activeWorkspace = core.config.workspaces[core.state.currentWorkspaceIdx];
        const currentApps = core.allApps.filter(a => a.workspace === activeWorkspace.name);

        if (core.state.currentView === 'MENU') {
            midLines.push('  ' + 'WORKSPACES'.gray.bold);
            
            let workspacesLine = '  ';
            core.config.workspaces.forEach((ws, i) => {
                if (i === core.state.currentWorkspaceIdx) workspacesLine += primary(`[ ${ws.name} ]`) + '   ';
                else workspacesLine += `  ${ws.name}  `.gray + '   ';
            });
            midLines.push(workspacesLine);
            midLines.push('');
            
            const totalPages = Math.max(1, Math.ceil(currentApps.length / core.state.ITEMS_PER_PAGE));
            midLines.push('  ' + primary(t.title || 'Projects') + ` (Page ${core.state.currentPage + 1}/${totalPages})`.gray);
            midLines.push('  ' + b('─'.repeat(84)));
            
            const visibleProjects = currentApps.slice(core.state.currentPage * core.state.ITEMS_PER_PAGE, (core.state.currentPage + 1) * core.state.ITEMS_PER_PAGE);

            visibleProjects.forEach((p, index) => {
                const globalIndex = core.allApps.indexOf(p);
                const idLabel = `[${globalIndex}]`.gray;
                const idPadded = idLabel + ' '.repeat(Math.max(0, 5 - getVisibleLen(idLabel)));
                
                let icon = '⚡';
                let statusRaw = p.status || 'OFFLINE';
                let status = statusRaw.yellow;
                let spinner = '';

                if (statusRaw === 'ONLINE') {
                    icon = '🟢';
                    status = 'ONLINE'.green;
                } else if (statusRaw === 'ERROR' || statusRaw === 'CRASHED') {
                    icon = '🔴';
                    status = statusRaw.red;
                } else if (statusRaw === 'OFFLINE') {
                    icon = '⚪';
                    status = 'OFFLINE'.gray;
                } else if (statusRaw === 'STARTING') {
                    spinner = ' ' + b(core.state.spinnerFrames[core.state.frameIdx]);
                    icon = '🟡';
                }

                const typeLabel = p.type === 'express' ? '[API]'.blue : '[WEB]'.magenta;
                const typePadded = typeLabel + ' '.repeat(Math.max(0, 6 - getVisibleLen(typeLabel)));
                
                let displayName = p.name;
                if (displayName.length > 16) displayName = displayName.substring(0, 15) + '…';
                const namePadded = displayName + ' '.repeat(16 - displayName.length);
                
                let portStr = (p.actualPort || '---').toString();
                if (portStr.length > 6) portStr = portStr.substring(0, 5) + '…';
                const portPadded = portStr + ' '.repeat(6 - portStr.length);
                
                let line = `  ${idPadded} ${icon}  ${typePadded} ${namePadded} ${portPadded} ${status}${spinner}`;
                
                if (p.hasError) line += ' [!]'.red;
                midLines.push(line);
            });
            
            while (midLines.length < 13) {
                midLines.push('');
            }
        } 
        else if (core.state.currentView === 'SETTINGS') {
            midLines.push('  ' + primary(t.setMsg));
            midLines.push('  ' + b('─'.repeat(84)));
            midLines.push('');
            midLines.push(`    ${t.setLang}: ${core.config.settings.lang.toUpperCase().green.bold}`);
            
            const akColor = core.config.settings.autoKillPorts ? 'ON'.green.bold : 'OFF'.red.bold;
            midLines.push(`    ${t.setAutoKill}: ${akColor}`);
            
            const ctrlColor = core.config.settings.allowCtrlC ? 'ON'.green.bold : 'OFF'.red.bold;
            midLines.push(`    ${t.setCtrlC}: ${ctrlColor}`);
            
            midLines.push('');
            midLines.push(`    /lang <de|en>`.gray);
            midLines.push(`    /autokill <on|off>`.gray);
            midLines.push(`    /ctrlc <on|off>`.gray);
            midLines.push(`    /add <name> <path> <type> <port>`.gray);
            
            while (midLines.length < 13) {
                midLines.push('');
            }
        }
        else if (core.state.currentView === 'HELP') {
            const fs = require('fs');
            const path = require('path');
            const cmdsDir = path.join(__dirname, 'commands');
            let cmds = [];
            if (fs.existsSync(cmdsDir)) {
                const files = fs.readdirSync(cmdsDir).filter(f => f.endsWith('.js'));
                files.forEach(f => {
                    try {
                        const cmd = require(path.join(cmdsDir, f));
                        cmds.push({ name: cmd.name, desc: cmd.description });
                    } catch(e) {}
                });
            }

            const ITEMS_PER_PAGE = 5;
            const totalPages = Math.max(1, Math.ceil(cmds.length / ITEMS_PER_PAGE));
            if (!core.state.helpPage || core.state.helpPage >= totalPages) core.state.helpPage = 0;

            midLines.push('  ' + primary('All Commands') + ` (Page ${core.state.helpPage + 1}/${totalPages})`.gray);
            midLines.push('  ' + b('─'.repeat(84)));
            
            const visibleCmds = cmds.slice(core.state.helpPage * ITEMS_PER_PAGE, (core.state.helpPage + 1) * ITEMS_PER_PAGE);

            visibleCmds.forEach(c => {
                const namePadded = c.name + ' '.repeat(Math.max(0, 12 - c.name.length));
                midLines.push(`    /${namePadded}`.cyan + `   ${c.desc}`);
            });
            
            while (midLines.length < 13) {
                midLines.push('');
            }
        }

        for (let i = 0; i < 13; i++) {
            const m = midLines[i] || '';
            const padded = m + ' '.repeat(Math.max(0, 88 - getVisibleLen(m)));
            out += b('│') + padded.substring(0, padded.length - Math.max(0, getVisibleLen(padded) - 88)) + b('│\n');
        }

        out += b('├' + '─'.repeat(88) + '┤\n');

        const hintLines = [];
        if (core.state.currentView === 'MENU') {
            hintLines.push('  ' + primary(t.cmds || 'QUICK COMMANDS'));
            hintLines.push('  ' + b('[TAB]') + ' Next Workspace     ' + b('/help') + ' Show Commands     ' + b('/start <name>') + ' Start');
            hintLines.push('  ' + b('/logs <name>') + ' Logs          ' + b('/stop <name>') + ' Stop              ' + b('/exit') + ' Quit');
            let errMsg = core.state.currentErrorMessage;
            if (errMsg && stripAnsi(errMsg).length > 80) errMsg = errMsg.substring(0, 77) + '...';
            hintLines.push(errMsg ? '  ❌ ' + errMsg.red : '');
        } else if (core.state.currentView === 'SETTINGS') {
            hintLines.push('  ' + primary(t.cmds || 'QUICK COMMANDS'));
            hintLines.push('  ' + b('/lang <de|en>') + `  ${t.setHelp}`);
            hintLines.push('  ' + b('/autokill    ') + `  ${t.cmdAutoKill}`);
            let errMsg = core.state.currentErrorMessage;
            if (errMsg && stripAnsi(errMsg).length > 80) errMsg = errMsg.substring(0, 77) + '...';
            hintLines.push(errMsg ? '  ❌ ' + errMsg.red : '');
        } else if (core.state.currentView === 'HELP') {
            hintLines.push('  ' + primary('QUICK COMMANDS'));
            hintLines.push('  ' + b('[TAB]') + ' Next Page        ' + b('/menu') + ' Back to Menu');
            let errMsg = core.state.currentErrorMessage;
            if (errMsg && stripAnsi(errMsg).length > 80) errMsg = errMsg.substring(0, 77) + '...';
            hintLines.push(errMsg ? '  ❌ ' + errMsg.red : '');
        }

        for (let i = 0; i < 4; i++) {
            const h = hintLines[i] || '';
            const padded = h + ' '.repeat(Math.max(0, 88 - getVisibleLen(h)));
            out += b('│') + padded.substring(0, padded.length - Math.max(0, getVisibleLen(padded) - 88)) + b('│\n');
        }

        out += b('├' + '─'.repeat(88) + '┤\n');
        
        const MAX_INPUT_LEN = 83; 
        let inputStr = rl ? rl.line : '';
        let displayStr = inputStr;
        let cursorOffset = rl ? rl.cursor : 0;

        if (inputStr.length > MAX_INPUT_LEN) {
            const start = Math.max(0, inputStr.length - MAX_INPUT_LEN);
            displayStr = inputStr.substring(start);
            cursorOffset = rl.cursor - start;
        }

        out += b('│ ') + primary('❯ ') + displayStr + ' '.repeat(Math.max(0, MAX_INPUT_LEN - displayStr.length)) + b(' │\n');
        out += b('╰' + '─'.repeat(88) + '╯\n');

        readLineMod.cursorTo(process.stdout, 0, 0);
        process.stdout.write(out);
        if (rl) readLineMod.cursorTo(process.stdout, 4 + cursorOffset, 22);
    }

    function showError(msg) {
        core.state.currentErrorMessage = msg;
        showMenu();
        setTimeout(() => {
            if (core.state.currentErrorMessage === msg) {
                core.state.currentErrorMessage = '';
                showMenu();
            }
        }, 3000);
    }

    process.stdout.on('resize', () => {
        if (core.state.currentView !== 'LOGS') {
            fullClear();
            showMenu();
        }
    });

    return {
        setRl: (instance) => rl = instance,
        fullClear,
        showMenu,
        showError
    };
};