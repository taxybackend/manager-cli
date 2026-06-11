module.exports = {
    name: 'project',
    description: 'Move project to workspace',
    execute: async (args, core, consoleManager) => {
        if (args.length < 2) {
            const msg = "Usage: /project <id|name> <workspace_name>";
            if (consoleManager && !core.isHeadless) consoleManager.showError(msg);
            else core.log('project', msg);
            return;
        }

        const identifier = args[0];
        const newWorkspaceName = args.slice(1).join(' ');

        const resolveProject = (id_or_name) => {
            const id = parseInt(id_or_name, 10);
            if (!isNaN(id) && id >= 0 && id < core.allApps.length) {
                return core.allApps[id];
            }
            return core.allApps.find(p => p.name === id_or_name);
        };

        const targetApp = resolveProject(identifier);
        if (!targetApp) {
            const msg = `Project ${identifier} not found.`;
            if (consoleManager && !core.isHeadless) consoleManager.showError(msg);
            else core.log('project', msg);
            return;
        }

        // Find old workspace
        const oldWs = core.config.workspaces.find(ws => ws.name === targetApp.workspace);
        if (oldWs) {
            oldWs.apps = oldWs.apps.filter(a => a.name !== targetApp.name);
        }

        // Find or create new workspace
        let newWs = core.config.workspaces.find(ws => ws.name === newWorkspaceName);
        if (!newWs) {
            newWs = { name: newWorkspaceName, apps: [] };
            core.config.workspaces.push(newWs);
        }

        // Move app data to new workspace
        const appData = {
            name: targetApp.name,
            path: targetApp.path,
            type: targetApp.type,
            port: targetApp.port,
            command: targetApp.command,
            startup: targetApp.startup || false
        };
        newWs.apps.push(appData);
        targetApp.workspace = newWorkspaceName;

        core.config.saveWorkspaces();
        core.rebuildAppsList();
        
        // Find new workspace index
        const wsIdx = core.config.workspaces.findIndex(ws => ws.name === newWorkspaceName);
        if (wsIdx !== -1) {
            core.state.currentWorkspaceIdx = wsIdx;
        }

        if (consoleManager && !core.isHeadless) {
            core.state.currentPage = 0;
            consoleManager.fullClear();
            consoleManager.showMenu();
        } else {
            core.log('project', `Moved project ${targetApp.name} to workspace "${newWorkspaceName}"`);
        }
    }
};
