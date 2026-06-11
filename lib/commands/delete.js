module.exports = {
    name: 'delete',
    description: 'Delete and stop a project',
    execute: async (args, core, consoleManager) => {
        const [nameOrId] = args;
        if (!nameOrId) {
            const msg = "Usage: /delete <name_or_id>";
            if (consoleManager && !core.isHeadless) consoleManager.showError(msg);
            else core.log('delete', msg);
            return;
        }

        let project;
        // Check if ID (number)
        const id = parseInt(nameOrId, 10);
        if (!isNaN(id) && id >= 0 && id < core.allApps.length) {
            project = core.allApps[id];
        } else {
            project = core.allApps.find(a => a.name === nameOrId);
        }

        if (!project) {
            const msg = `Project ${nameOrId} not found.`;
            if (consoleManager && !core.isHeadless) consoleManager.showError(msg);
            else core.log('delete', msg);
            return;
        }

        // Stop it first
        if (project.status !== 'OFFLINE') {
            await core.stopProject(project);
        }

        // Remove from config
        const ws = core.config.workspaces.find(w => w.name === project.workspace);
        if (ws) {
            ws.apps = ws.apps.filter(a => a.name !== project.name);
            core.config.saveWorkspaces();
            core.rebuildAppsList();
        }

        if (consoleManager && !core.isHeadless) {
            core.state.currentView = 'MENU';
            consoleManager.fullClear();
            consoleManager.showMenu();
        } else {
            const padStr = (str, len) => (str + ' '.repeat(len)).substring(0, len);
            console.log('\n\x1b[90m╭──────────────────────────────────────────╮\x1b[0m');
            console.log('\x1b[90m│\x1b[0m  \x1b[31m✔ PROJECT DELETED\x1b[0m                       \x1b[90m│\x1b[0m');
            console.log('\x1b[90m├──────────────────────────────────────────┤\x1b[0m');
            console.log(`\x1b[90m│\x1b[0m  Name:    \x1b[37;1m${padStr(project.name, 30)}\x1b[0m \x1b[90m│\x1b[0m`);
            console.log('\x1b[90m╰──────────────────────────────────────────╯\x1b[0m\n');
        }
    }
};
