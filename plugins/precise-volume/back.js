const { injectCSS } = require("../utils");
const path = require("path");

let enabled = false;

const { globalShortcut } = require('electron');

module.exports = (win, options) => {
    enabled = true;
    injectCSS(win.webContents, path.join(__dirname, "volume-hud.css"));

    if (options.globalShortcuts?.volumeUp) {
		globalShortcut.register((options.globalShortcuts.volumeUp), () => win.webContents.send('changeVolume', true));
	}
	if (options.globalShortcuts?.volumeDown) {
		globalShortcut.register((options.globalShortcuts.volumeDown), () => win.webContents.send('changeVolume', false));
	}
}

module.exports.enabled = () => enabled;
