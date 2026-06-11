module.exports = {
    name: 'next',
    description: 'Next page',
    execute: async (args, core, consoleManager) => {
        const currentApps = core.allApps.filter(a => a.workspace === core.config.workspaces[core.state.currentWorkspaceIdx].name);
        if ((core.state.currentPage + 1) * core.state.ITEMS_PER_PAGE < currentApps.length) {
            core.state.currentPage++;
            if (consoleManager && !core.isHeadless) {
                consoleManager.fullClear();
                consoleManager.showMenu();
            }
        }
    }
};
