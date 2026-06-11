module.exports = {
    name: 'lang',
    description: 'Change language',
    execute: async (args, core, consoleManager) => {
        const newLang = args[0];
        if (newLang === 'de' || newLang === 'en') {
            core.config.settings.lang = newLang;
            core.config.saveSettings();
            if (consoleManager && !core.isHeadless) {
                consoleManager.fullClear();
                consoleManager.showMenu();
            } else {
                console.log(`Language changed to ${newLang}`);
            }
        }
    }
};
