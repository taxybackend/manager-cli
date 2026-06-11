module.exports = {
    name: 'settings',
    description: 'Show settings',
    execute: async (args, core, consoleManager) => {
        core.state.currentView = 'SETTINGS';
        core.state.currentProjectLog = null;
        if (consoleManager && !core.isHeadless) {
            consoleManager.fullClear();
            consoleManager.showMenu();
        }
    }
};
