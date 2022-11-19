const Discord = require("discord-rpc");
const { dev } = require("electron-is");
const { dialog, app } = require("electron");
const registerCallback = require("../../providers/song-info");
const clientId = "942539762227630162";
const info = {
	rpc: null,
	ready: false,
	lastSongInfo: null,
};
const refreshCallbacks = [];
const resetInfo = () => {
	info.rpc = null;
	info.ready = false;
	clearTimeout(clearActivity);
	if (dev()) console.log("discord disconnected");
	refreshCallbacks.forEach(cb => cb());
};
let window;
const connect = (showErr = false) => {
	if (info.rpc) {
		if (dev())
			console.log('Attempted to connect with active RPC object');
		return;
	}
	info.rpc = new Discord.Client({
		transport: "ipc",
	});
	info.ready = false;
	info.rpc.once("connected", () => {
		if (dev()) console.log("discord connected");
		refreshCallbacks.forEach(cb => cb());
	});
	info.rpc.once("ready", () => {
		info.ready = true;
		if (info.lastSongInfo) updateActivity(info.lastSongInfo)
	});
	info.rpc.once("disconnected", resetInfo);
	info.rpc.login({ clientId }).catch(err => {
		resetInfo();
		if (dev()) console.error(err);
		if (showErr) dialog.showMessageBox(window, { title: 'Connection failed', message: err.message || String(err), type: 'error' });
	});
};
let clearActivity;
let updateActivity;
module.exports = (win, { activityTimoutEnabled, activityTimoutTime, listenAlong, hideDurationLeft }) => {
	window = win;
	updateActivity = songInfo => {
		if (songInfo.title.length === 0 && songInfo.artist.length === 0) {
			return;
		}
		info.lastSongInfo = songInfo;
		clearTimeout(clearActivity);
		if (!info.rpc || !info.ready) {
			return;
		}
		if (songInfo.isPaused && activityTimoutEnabled && activityTimoutTime === 0) {
			info.rpc.clearActivity().catch(console.error);
			return;
		}
		const activityInfo = {
			type: 2,
			details: songInfo.title,
			state: songInfo.artist,
			largeImageKey: songInfo.imageSrc,
			largeImageText: songInfo.album,
				buttons: listenAlong ? [
				{ label: "Listen Along", url: songInfo.url },
			] : undefined,
		};
		if (songInfo.isPaused) {
			activityInfo.smallImageKey = "paused";
			activityInfo.smallImageText = "Paused";
			if (activityTimoutEnabled)
				clearActivity = setTimeout(() => info.rpc.clearActivity().catch(console.error), activityTimoutTime ?? 10000);
		} else if (!hideDurationLeft) {
			const songStartTime = Date.now() - songInfo.elapsedSeconds * 1000;
			activityInfo.startTimestamp = songStartTime;
			activityInfo.endTimestamp =
				songStartTime + songInfo.songDuration * 1000;
		}
		info.rpc.setActivity(activityInfo).catch(console.error);
	};
	win.once("ready-to-show", () => {
		registerCallback(updateActivity);
		connect();
	});
	app.on('window-all-closed', module.exports.clear)
};
module.exports.clear = () => {
	if (info.rpc) info.rpc.clearActivity();
	clearTimeout(clearActivity);
};
module.exports.connect = connect;
module.exports.registerRefresh = (cb) => refreshCallbacks.push(cb);
module.exports.isConnected = () => info.rpc !== null;
