// src/services/playerTracker.js
const { spawn } = require("child_process");
const EventEmitter = require("events");
const readline = require("readline");

class PlayerTracker extends EventEmitter {
  constructor(logFile) {
    super();
    this.players = new Map();

    // Arranca tail -F
    const tail = spawn("tail", ["-n", "0", "-F", logFile], {
      stdio: ["ignore", "pipe", "inherit"],
    });

    const rl = readline.createInterface({ input: tail.stdout });
    rl.on("line", (line) => this._onLine(line));
  }

  _onLine(line) {
    let m;
    if ((m = line.match(/Player connected: ([^,]+), xuid: ([0-9]+)/))) {
      this.players.set(m[1], m[2]);
      this._emitUpdate();
    }
    if ((m = line.match(/Player disconnected: ([^,]+), xuid: ([0-9]+)/))) {
      this.players.delete(m[1]);
      this._emitUpdate();
    }
  }

  _emitUpdate() {
    const arr = Array.from(this.players.entries()).map(([name, xuid]) => ({
      name,
      xuid,
    }));
    this.emit("update", arr);
  }

  snapshot() {
    return Array.from(this.players.entries()).map(([name, xuid]) => ({
      name,
      xuid,
    }));
  }
}

module.exports = PlayerTracker;
