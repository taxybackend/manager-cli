module.exports = {
    name: 'back',
    description: 'Go back to menu',
    execute: async (args, core, consoleManager) => {
        core.state.currentView = 'MENU';
        core.state.currentProjectLog = null;
        if (consoleManager && !core.isHeadless) {
            consoleManager.fullClear();
            consoleManager.showMenu();
        }
    }
};
