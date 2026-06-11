const fs = require('fs');
const path = require('path');
const os = require('os');

const inputDir = path.join(os.homedir(), '.manager-cli');
if (!fs.existsSync(inputDir)) fs.mkdirSync(inputDir);

const configPath = path.join(inputDir, 'config.json');
if (!fs.existsSync(configPath)) {
    fs.writeFileSync(configPath, JSON.stringify([{ name: "Main Workspace", apps: [] }], null, 4));
}

const langPath = path.join(inputDir, 'language.json');
const defaultLangData = {
    "de": {
        "title": "Projekte & Status",
        "page": "Seite",
        "cmds": "Schnellbefehle:",
        "cmdLogs": "Live-Logs eines Projekts aufrufen",
        "cmdMenu": "Zurück zur Übersicht",
        "cmdNext": "Nächste Seite",
        "cmdPrev": "Vorherige Seite",
        "cmdSettings": "Einstellungen",
        "cmdExit": "Alle Prozesse beenden",
        "setMsg": "Einstellungen",
        "setLang": "Sprache",
        "setHelp": "Sprache ändern",
        "setAutoKill": "Auto-Kill Ports",
        "cmdAutoKill": "Auto-Kill umschalten",
        "setCtrlC": "Strg+C Beenden",
        "cmdCtrlC": "Strg+C umschalten",
        "cmdAdd": "Projekt in aktuellen Tab: /add <name> <pfad> <type> <port>",
        "errCmd": "Unbekannter Befehl. Nutze /help für alle Befehle.",
        "errProj": "Projekt nicht gefunden.",
        "errArgs": "Fehlende Argumente.",
        "exitMsg": "Beende alle Prozesse. Bitte warten...",
        "exitDone": "Alle Prozesse beendet. Goodbye!",
        "helpTitle": "Hilfe & Alle Befehle",
        "cmdStart": "Projekt starten",
        "cmdStop": "Projekt stoppen",
        "cmdRestart": "Projekt neustarten",
        "cmdHelp": "Diese Hilfe anzeigen",
        "warnCtrlC": "Strg+C ist deaktiviert! Nutze /exit zum Beenden."
    },
    "en": {
        "title": "Projects & Status",
        "page": "Page",
        "cmds": "Quick Commands:",
        "cmdLogs": "View live logs of a project",
        "cmdMenu": "Return to dashboard",
        "cmdNext": "Show next page",
        "cmdPrev": "Show previous page",
        "cmdSettings": "Open settings",
        "cmdExit": "Kill all processes",
        "setMsg": "Settings",
        "setLang": "Language",
        "setHelp": "Change language",
        "setAutoKill": "Auto-Kill Ports",
        "cmdAutoKill": "Toggle Auto-Kill",
        "setCtrlC": "Ctrl+C Exit",
        "cmdCtrlC": "Toggle Ctrl+C",
        "cmdAdd": "Add to current tab: /add <name> <path> <type> <port>",
        "errCmd": "Unknown command. Type /help for all commands.",
        "errProj": "Project not found.",
        "errArgs": "Missing arguments.",
        "exitMsg": "Killing all processes. Please wait...",
        "exitDone": "All processes terminated. Goodbye!",
        "helpTitle": "Help & All Commands",
        "cmdStart": "Start a project",
        "cmdStop": "Stop a project",
        "cmdRestart": "Restart a project",
        "cmdHelp": "Show this help menu",
        "warnCtrlC": "Ctrl+C is disabled! Use /exit to quit."
    }
};

if (!fs.existsSync(langPath)) {
    fs.writeFileSync(langPath, JSON.stringify(defaultLangData, null, 4));
}
const i18n = JSON.parse(fs.readFileSync(langPath, 'utf8'));

const settingsPath = path.join(inputDir, 'settings.json');
let settings = { lang: 'en', autoKillPorts: true, allowCtrlC: true };
if (fs.existsSync(settingsPath)) {
    settings = { ...settings, ...JSON.parse(fs.readFileSync(settingsPath, 'utf8')) };
} else {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 4));
}

function saveSettings() {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 4));
}

let workspaces = JSON.parse(fs.readFileSync(configPath, 'utf8'));

if (workspaces.length > 0 && !workspaces[0].apps) {
    workspaces = [{ name: "Imported Projects", apps: workspaces }];
    fs.writeFileSync(configPath, JSON.stringify(workspaces, null, 4));
} else if (workspaces.length === 0) {
    workspaces = [{ name: "Main Workspace", apps: [] }];
    fs.writeFileSync(configPath, JSON.stringify(workspaces, null, 4));
}

function saveWorkspaces() {
    fs.writeFileSync(configPath, JSON.stringify(workspaces, null, 4));
}

module.exports = {
    i18n,
    settings,
    saveSettings,
    workspaces,
    saveWorkspaces
};