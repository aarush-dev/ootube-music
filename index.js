"use strict";
const path = require("path");
const electron = require("electron");
const enhanceWebRequest = require("electron-better-web-request").default;
const is = require("electron-is");
const unhandled = require("electron-unhandled");
const { autoUpdater } = require("electron-updater");
const config = require("./config");
const { setApplicationMenu } = require("./menu");
const { fileExists, injectCSS } = require("./plugins/utils");
const { setUpTray } = require("./tray");
const { setupSongInfo } = require("./providers/song-info");
const { setupAppControls, restart } = require("./providers/app-controls");
unhandled({
	logger: console.error,
	showDialog: false,
});
process.env.NODE_OPTIONS = "";
const app = electron.app;
let mainWindow;
autoUpdater.autoDownload = false;
if(config.get("options.singleInstanceLock")){
	const gotTheLock = app.requestSingleInstanceLock();
	if (!gotTheLock) app.quit();
	app.on('second-instance', () => {
		if (!mainWindow) return;
		if (mainWindow.isMinimized()) mainWindow.restore();
		if (!mainWindow.isVisible()) mainWindow.show();
		mainWindow.focus();
	});
}
app.commandLine.appendSwitch(
	"js-flags",
	"--experimental-wasm-threads"
);
app.commandLine.appendSwitch("enable-features", "SharedArrayBuffer");
app.allowRendererProcessReuse = true;
if (config.get("options.disableHardwareAcceleration")) {
	if (is.dev()) {
		console.log("Disabling hardware acceleration");
	}
	app.disableHardwareAcceleration();
}
if (is.linux() && config.plugins.isEnabled("shortcuts")) {
	app.commandLine.appendSwitch('disable-features', 'MediaSessionService');
}
if (config.get("options.proxy")) {
	app.commandLine.appendSwitch("proxy-server", config.get("options.proxy"));
}
require("electron-debug")({
	showDevTools: false });
let icon = "assets/youtube-music.png";
if (process.platform == "win32") {
	icon = "assets/generated/icon.ico";
} else if (process.platform == "darwin") {
	icon = "assets/generated/icon.icns";
}
function onClosed() {
	mainWindow = null;
}
function loadPlugins(win) {
	injectCSS(win.webContents, path.join(__dirname, "youtube-music.css"));
	const themes = config.get("options.themes");
	if (Array.isArray(themes)) {
		themes.forEach((cssFile) => {
			fileExists(
				cssFile,
				() => {
					injectCSS(win.webContents, cssFile);
				},
				() => {
					console.warn(`CSS file "${cssFile}" does not exist, ignoring`);
				}
			);
		});
	}
	win.webContents.once("did-finish-load", () => {
		if (is.dev()) {
			console.log("did finish load");
			win.webContents.openDevTools();
		}
	});
	config.plugins.getEnabled().forEach(([plugin, options]) => {
		console.log("Loaded plugin - " + plugin);
		const pluginPath = path.join(__dirname, "plugins", plugin, "back.js");
		fileExists(pluginPath, () => {
			const handle = require(pluginPath);
			handle(win, options);
		});
	});
}
function createMainWindow() {
	const windowSize = config.get("window-size");
	const windowMaximized = config.get("window-maximized");
	const windowPosition = config.get("window-position");
	const win = new electron.BrowserWindow({
		icon: icon,
		width: windowSize.width,
		height: windowSize.height,
		backgroundColor: "#000",
		show: false,
		webPreferences: {
			contextIsolation: false,
			preload: path.join(__dirname, "preload.js"),
			nodeIntegrationInSubFrames: true,
			affinity: "main-window",
			...{
						sandbox: false,
				  }
		},
		frame: true ,
		titleBarStyle: false
			? "hidden"
			: false
			? "hiddenInset"
			: "default",
		autoHideMenuBar: config.get("options.hideMenu"),
	});
	if (windowPosition) {
		const { x, y } = windowPosition;
		const winSize = win.getSize();
		const displaySize =
			electron.screen.getDisplayNearestPoint(windowPosition).bounds;
		if (
			x + winSize[0] < displaySize.x - 8 ||
			x - winSize[0] > displaySize.x + displaySize.width ||
			y < displaySize.y - 8 ||
			y > displaySize.y + displaySize.height
		) {
			if (is.dev()) {
				console.log(
					`Window tried to render offscreen, windowSize=${winSize}, displaySize=${displaySize}, position=${windowPosition}`
				);
			}
		} else {
			win.setPosition(x, y);
		}
	}
	if (windowMaximized) {
		win.maximize();
	}
	if(config.get("options.alwaysOnTop")){
		win.setAlwaysOnTop(true);
	}
	const urlToLoad = config.get("options.resumeOnStart")
		? config.get("url")
		: config.defaultConfig.url;
	win.webContents.loadURL(urlToLoad);
	win.on("closed", onClosed);
	const setPiPOptions = config.plugins.isEnabled("picture-in-picture") 
		? (key, value) => require("./plugins/picture-in-picture/back").setOptions({ [key]: value })
		: () => {};
	win.on("move", () => {
		if (win.isMaximized()) return;
		let position = win.getPosition();
		const isPiPEnabled =
			config.plugins.isEnabled("picture-in-picture") &&
			config.plugins.getOptions("picture-in-picture")["isInPiP"];
		if (!isPiPEnabled) {
			lateSave("window-position", { x: position[0], y: position[1] });
		} else if(config.plugins.getOptions("picture-in-picture")["savePosition"]) {
			lateSave("pip-position", position, setPiPOptions);
		}
	});
	let winWasMaximized;
	win.on("resize", () => {
		const windowSize = win.getSize();
		const isMaximized = win.isMaximized();
		const isPiPEnabled =
			config.plugins.isEnabled("picture-in-picture") &&
			config.plugins.getOptions("picture-in-picture")["isInPiP"];
		if (!isPiPEnabled && winWasMaximized !== isMaximized) {
			winWasMaximized = isMaximized;
			config.set("window-maximized", isMaximized);
		}
		if (isMaximized) return;
		if (!isPiPEnabled) {
			lateSave("window-size", {
				width: windowSize[0],
				height: windowSize[1],
			});
		} else if(config.plugins.getOptions("picture-in-picture")["saveSize"]) {
			lateSave("pip-size", windowSize, setPiPOptions);
		}
	});
	let savedTimeouts = {};
	function lateSave(key, value, fn = config.set) {
		if (savedTimeouts[key]) clearTimeout(savedTimeouts[key]);
		savedTimeouts[key] = setTimeout(() => {
			fn(key, value);
			savedTimeouts[key] = undefined;
		}, 600);
	}
	win.webContents.on("render-process-gone", (event, webContents, details) => {
		showUnresponsiveDialog(win, details);
	});
	win.once("ready-to-show", () => {
		if (config.get("options.appVisible")) {
			win.show();
		}
	});
	removeContentSecurityPolicy();
	return win;
}
app.once("browser-window-created", (event, win) => {
	if (config.get("options.overrideUserAgent")) {
		const originalUserAgent = win.webContents.userAgent;
		const userAgents = {
			mac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 12.1; rv:95.0) Gecko/20100101 Firefox/95.0",
			windows: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:95.0) Gecko/20100101 Firefox/95.0",
			linux: "Mozilla/5.0 (Linux x86_64; rv:95.0) Gecko/20100101 Firefox/95.0",
		}
		const updatedUserAgent =
			is.macOS() ? userAgents.mac :
				is.windows() ? userAgents.windows :
					userAgents.linux;
		win.webContents.userAgent = updatedUserAgent;
		app.userAgentFallback = updatedUserAgent;
		win.webContents.session.webRequest.onBeforeSendHeaders((details, cb) => {
			if (win.webContents.getURL().startsWith("https://accounts.google.com") && details.url.startsWith("https://accounts.google.com")) {
				details.requestHeaders["User-Agent"] = originalUserAgent;
			}
			cb({ requestHeaders: details.requestHeaders });
		});
	}
	setupSongInfo(win);
	loadPlugins(win);
	setupAppControls();
	win.webContents.on("did-fail-load", (
		_event,
		errorCode,
		errorDescription,
		validatedURL,
		isMainFrame,
		frameProcessId,
		frameRoutingId,
	) => {
		const log = JSON.stringify({
			error: "did-fail-load",
			errorCode,
			errorDescription,
			validatedURL,
			isMainFrame,
			frameProcessId,
			frameRoutingId,
		}, null, "\t");
		if (is.dev()) {
			console.log(log);
		}
		
	});
	win.webContents.on("will-prevent-unload", (event) => {
		event.preventDefault();
	});
	win.webContents.on(
		"new-window",
		(e, url, frameName, disposition, options) => {
			options.webPreferences.affinity = "main-window";
		}
	);
});
app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
	electron.globalShortcut.unregisterAll();
});
app.on("activate", () => {
	if (mainWindow === null) {
		mainWindow = createMainWindow();
	} else if (!mainWindow.isVisible()) {
		mainWindow.show();
	}
});
app.on("ready", () => {
	if (config.get("options.autoResetAppCache")) {
		const clearCacheTimeout = setTimeout(() => {
			if (is.dev()) {
				console.log("Clearing app cache.");
			}
			electron.session.defaultSession.clearCache();
			clearTimeout(clearCacheTimeout);
		}, 20000);
	}
	if (is.windows()) {
		const appID = "in.theindianschool.ootube-music";
		app.setAppUserModelId(appID);
		const appLocation = process.execPath;
		const appData = app.getPath("appData");
		if (!is.dev() && !appLocation.startsWith(path.join(appData, "..", "Local", "Temp"))) {
			const shortcutPath = path.join(appData, "Microsoft", "Windows", "Start Menu", "Programs", "OoTube Music.lnk");
			try {
				const shortcutDetails = electron.shell.readShortcutLink(shortcutPath);
				if (shortcutDetails.target !== appLocation || shortcutDetails.appUserModelId !== appID) {
					throw "needUpdate";
				}
			} catch (error) {
				electron.shell.writeShortcutLink(
					shortcutPath,
					error === "needUpdate" ? "update" : "create",
					{
						target: appLocation,
						cwd: appLocation.slice(0, appLocation.lastIndexOf(path.sep)),
						description: "YouTube Music Desktop App - including custom plugins",
						appUserModelId: appID
					}
				);
			}
		}
	}
	mainWindow = createMainWindow();
	setApplicationMenu(mainWindow);
	setUpTray(app, mainWindow);
	app.setLoginItemSettings({
		openAtLogin: config.get("options.startAtLogin"),
	});
	if (is.macOS() && !config.get("options.appVisible")) {
		app.dock.hide();
	}
	let forceQuit = false;
	app.on("before-quit", () => {
		forceQuit = true;
	});
	if (is.macOS() || config.get("options.tray")) {
		mainWindow.on("close", (event) => {
			if (!forceQuit) {
				event.preventDefault();
				mainWindow.hide();
			}
		});
	}
});
function showUnresponsiveDialog(win, details) {
	if (!!details) {
		console.log("Unresponsive Error!\n"+JSON.stringify(details, null, "\t"))
	}
	electron.dialog.showMessageBox(win, {
		type: "error",
		title: "Window Unresponsive",
		message: "The Application is Unresponsive",
		details: "We are sorry for the inconvenience! please choose what to do:",
		buttons: ["Wait", "Relaunch", "Quit"],
		cancelId: 0
	}).then( result => {
		switch (result.response) {
			case 1: restart(); break;
			case 2: app.quit(); break;
		}
	});
}
function removeContentSecurityPolicy(
	session = electron.session.defaultSession
) {
	enhanceWebRequest(session);
	session.webRequest.onHeadersReceived(function (details, callback) {
		if (
			!details.responseHeaders["content-security-policy-report-only"] &&
			!details.responseHeaders["content-security-policy"]
		)
			return callback({ cancel: false });
		delete details.responseHeaders["content-security-policy-report-only"];
		delete details.responseHeaders["content-security-policy"];
		callback({ cancel: false, responseHeaders: details.responseHeaders });
	});
	session.webRequest.setResolver("onHeadersReceived", (listeners) => {
		const response = listeners.reduce(
			async (accumulator, listener) => {
				if (accumulator.cancel) {
					return accumulator;
				}
				const result = await listener.apply();
				return { ...accumulator, ...result };
			},
			{ cancel: false }
		);
		return response;
	});
}
