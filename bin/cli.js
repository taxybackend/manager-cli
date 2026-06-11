#!/usr/bin/env node
const net = require('net');
const { spawn } = require('child_process');
const path = require('path');

const os = require('os');

const SOCKET_PATH = process.platform === 'win32'
    ? `\\\\.\\pipe\\manager-cli-${Buffer.from(os.userInfo().username).toString('hex')}`
    : path.join(os.homedir(), '.manager-cli', 'data.sock');
const daemonPath = path.join(__dirname, '..', 'lib', 'daemon.js');
const clientPath = path.join(__dirname, '..', 'lib', 'client.js');

function startClient() {
    require(clientPath);
}

function checkDaemonAndStart() {
    const socket = new net.Socket();
    
    socket.setTimeout(1000);
    
    socket.on('connect', () => {
        // Daemon is running
        socket.destroy();
        startClient();
    });

    socket.on('timeout', () => {
        socket.destroy();
        spawnDaemon();
    });

    socket.on('error', (err) => {
        // Connection failed, start daemon
        if (err.code === 'ECONNREFUSED' || err.code === 'ENOENT') {
            const fs = require('fs');
            if (fs.existsSync(SOCKET_PATH)) {
                try { fs.unlinkSync(SOCKET_PATH); } catch(e) {}
            }
        }
        spawnDaemon();
    });

    socket.connect({ path: SOCKET_PATH });
}

function spawnDaemon() {
    console.log("Starting background daemon...");
    const child = spawn('node', [daemonPath], {
        detached: true,
        stdio: 'ignore'
    });
    
    child.unref();

    // Give daemon time to start TCP server
    setTimeout(() => {
        startClient();
    }, 1000);
}

checkDaemonAndStart();
