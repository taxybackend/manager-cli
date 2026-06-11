module.exports = {
    name: 'shutdown',
    description: 'Shutdown Daemon',
    execute: async (args, core, consoleManager) => {
        if (core.shutdownDaemon) {
            core.shutdownDaemon();
        }
    }
};
