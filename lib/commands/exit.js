module.exports = {
    name: 'exit',
    description: 'Detach CLI',
    execute: async (args, core, consoleManager) => {
        if (core.killAllAndExit) {
            core.killAllAndExit();
        }
    }
};
