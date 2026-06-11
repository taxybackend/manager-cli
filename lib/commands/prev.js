module.exports = {
    name: 'prev',
    description: 'Previous page',
    execute: async (args, core, consoleManager) => {
        if (core.state.currentPage > 0) {
            core.state.currentPage--;
            if (consoleManager && !core.isHeadless) {
                consoleManager.fullClear();
                consoleManager.showMenu();
            }
        }
    }
};
