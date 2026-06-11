require('colors');

module.exports = function(core, consoleManager) {

    function completer(line) {
        if (line.trim() === '') {
            if (core.state.currentView === 'HELP') {
                core.state.helpPage = (core.state.helpPage || 0) + 1;
            } else {
                core.state.currentWorkspaceIdx = (core.state.currentWorkspaceIdx + 1) % core.config.workspaces.length;
                core.state.currentPage = 0;
            }
            setTimeout(() => consoleManager.showMenu(), 5);
            return [[], line];
        }

        const fs = require('fs');
        const path = require('path');
        const cmdsDir = path.join(__dirname, 'commands');
        let customCmds = [];
        if (fs.existsSync(cmdsDir)) {
            customCmds = fs.readdirSync(cmdsDir)
                .filter(f => f.endsWith('.js'))
                .map(f => '/' + f.replace('.js', ''));
        }

        const builtinCmds = ['/logs', '/menu', '/back', '/settings', '/help', '/lang', '/autokill', '/ctrlc', '/next', '/prev', '/exit', '/shutdown'];
        const cmds = [...builtinCmds, ...customCmds, '/start', '/stop', '/restart'];
        
        // Quote-aware splitting
        const argsMatch = line.match(/(".*?"|[^"\s]+)+(?=\s*|\s*$)/g) || [];
        const args = argsMatch.map(s => s.replace(/(^"|"$)/g, ''));

        if (args.length === 1) {
            const hits = cmds.filter(c => c.startsWith(args[0].toLowerCase()));
            return hits.length === 1 ? [[hits[0] + ' '], line] : [[], line];
        } else if (args.length === 2) {
            const cmd = args[0].toLowerCase();
            if (['/logs', '/start', '/stop', '/restart', '/delete'].includes(cmd)) {
                const projectNames = core.allApps.map(p => p.name);
                const hits = projectNames.filter(n => n.toLowerCase().startsWith(args[1].toLowerCase()));
                return hits.length === 1 ? [[`${cmd} ${hits[0]} `], line] : [[], line];
            }
            if (cmd === '/lang') {
                const hits = ['de', 'en'].filter(l => l.startsWith(args[1].toLowerCase()));
                return hits.length === 1 ? [[`${cmd} ${hits[0]} `], line] : [[], line];
            }
            if (['/autokill', '/ctrlc'].includes(cmd)) {
                const hits = ['on', 'off'].filter(s => s.startsWith(args[1].toLowerCase()));
                return hits.length === 1 ? [[`${cmd} ${hits[0]} `], line] : [[], line];
            }
        }
        return [[], line];
    }

    async function handleLine(input) {
        const rawCommand = input.trim();
        if (rawCommand === '') return;
        
        // Quote-aware splitting
        const argsMatch = rawCommand.replace(/^\//, '').match(/(".*?"|[^"\s]+)+(?=\s*|\s*$)/g) || [];
        const args = argsMatch.map(s => s.replace(/(^"|"$)/g, ''));
        
        const command = args[0].toLowerCase();
        const t = core.config.i18n[core.config.settings.lang] || core.config.i18n['en'];

        // Check dynamic commands
        const fs = require('fs');
        const path = require('path');
        const cmdPath = path.join(__dirname, 'commands', `${command}.js`);
        if (fs.existsSync(cmdPath)) {
            try {
                const dynamicCmd = require(cmdPath);
                await dynamicCmd.execute(args.slice(1), core, consoleManager);
                return;
            } catch (err) {
                if (consoleManager && !core.isHeadless) consoleManager.showError(`Error executing command: ${err.message}`);
                else console.log(`Error executing command: ${err.message}`);
                return;
            }
        }

        if (consoleManager && !core.isHeadless && core.state.currentView !== 'LOGS') {
            consoleManager.showError(t.errCmd);
        } else if (core.isHeadless) {
            console.log(t.errCmd || 'Unknown command.');
        }
    }

    return {
        completer,
        handleLine
    };
};