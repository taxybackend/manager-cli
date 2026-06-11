module.exports = {
    name: 'autokill',
    description: 'Toggle auto kill ports',
    execute: async (args, core, consoleManager) => {
        const state = args[0];
        if (state === 'on') core.config.settings.autoKillPorts = true;
        else if (state === 'off') core.config.settings.autoKillPorts = false;
        core.config.saveSettings();
        if (consoleManager && !core.isHeadless) {
            consoleManager.fullClear();
            consoleManager.showMenu();
        } else {
            console.log(`AutoKillPorts set to ${core.config.settings.autoKillPorts}`);
        }
    }
};
