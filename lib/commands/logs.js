require('colors');

module.exports = {
    name: 'logs',
    description: 'View live logs of a project',
    execute: async (args, core, consoleManager) => {
        const resolveProject = (identifier) => {
            if (!identifier) return null;
            const id = parseInt(identifier, 10);
            if (!isNaN(id) && id >= 0 && id < core.allApps.length) {
                return core.allApps[id];
            }
            return core.allApps.find(p => p.name === identifier);
        };

        const project = resolveProject(args[0]);
        const t = core.config.i18n[core.config.settings.lang] || core.config.i18n['en'];

        if (project) {
            const projectName = project.name;
            if (consoleManager && !core.isHeadless) {
                core.state.currentView = 'LOGS';
                core.state.currentProjectLog = projectName;
                project.hasError = false; 
                if (project.status === 'ERROR') project.status = 'ONLINE'; 
                
                consoleManager.fullClear();
                console.log(`=== LIVE LOGS: ${projectName.toUpperCase()} ===`.bgMagenta.white.bold);
                console.log(`(Tippe '/menu' für ${t.cmdMenu})\n`.gray);
                process.stdout.write((core.logs[projectName] || []).join(''));
            } else {
                console.log(`\n=== LOGS: ${projectName.toUpperCase()} ===`.bgMagenta.white.bold);
                process.stdout.write((core.logs[projectName] || []).join(''));
                console.log('\n');
            }
        } else {
            const msg = `Project ${args[0]} not found.`;
            if (consoleManager && !core.isHeadless) consoleManager.showError(msg);
            else core.log('logs', msg);
        }
    }
};
