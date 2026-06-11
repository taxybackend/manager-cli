module.exports = {
    name: 'help',
    description: 'Show help',
    execute: async (args, core, consoleManager) => {
        core.state.currentView = 'HELP';
        core.state.helpPage = 0;
        core.state.currentProjectLog = null;
        if (consoleManager && !core.isHeadless) {
            consoleManager.fullClear();
            consoleManager.showMenu();
        }
    }
};
