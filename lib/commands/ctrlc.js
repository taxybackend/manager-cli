module.exports = {
    name: 'ctrlc',
    description: 'Toggle Ctrl+C behavior',
    execute: async (args, core, consoleManager) => {
        const state = args[0];
        if (state === 'on') core.config.settings.allowCtrlC = true;
        else if (state === 'off') core.config.settings.allowCtrlC = false;
        core.config.saveSettings();
        if (consoleManager && !core.isHeadless) {
            consoleManager.fullClear();
            consoleManager.showMenu();
        } else {
            console.log(`AllowCtrlC set to ${core.config.settings.allowCtrlC}`);
        }
    }
};
