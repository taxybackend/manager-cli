module.exports = {
    name: 'start',
    description: 'Start a project',
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

        if (project) {
            await core.startSingleProject(project, true);
            if (consoleManager && !core.isHeadless) {
                core.state.currentView = 'MENU';
                consoleManager.fullClear();
                consoleManager.showMenu();
            } else {
                core.log('start', `Started project: ${project.name}`);
            }
        } else {
            const msg = `Project ${args[0]} not found.`;
            if (consoleManager && !core.isHeadless) consoleManager.showError(msg);
            else core.log('start', msg);
        }
    }
};
