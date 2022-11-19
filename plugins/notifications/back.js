const { Notification } = require("electron");
const is = require("electron-is");
const registerCallback = require("../../providers/song-info");
const { notificationImage } = require("./utils");
const notify = (info, options) => {
	const notification = {
		title: info.title || "Playing",
		body: info.artist,
		icon: notificationImage(info),
		silent: true,
		urgency: options.urgency,
	};
	const currentNotification = new Notification(notification);
	currentNotification.show()
	return currentNotification;
};
const setup = (options) => {
	let oldNotification;
	let currentUrl;
	registerCallback(songInfo => {
		if (!songInfo.isPaused && (songInfo.url !== currentUrl || options.unpauseNotification)) {
			oldNotification?.close();
			currentUrl = songInfo.url;
			setTimeout(() => { oldNotification = notify(songInfo, options) }, 10);
		}
	});
}
module.exports = (win, options) => {
	is.windows() && options.interactive ?
		require("./interactive")(win, options.unpauseNotification) :
		setup(options);
};
