const { ipcMain, nativeImage } = require("electron");
const fetch = require("node-fetch");
const config = require("../config");
const songInfo = {
	title: "",
	artist: "",
	views: 0,
	uploadDate: "",
	imageSrc: "",
	image: null,
	isPaused: undefined,
	songDuration: 0,
	elapsedSeconds: 0,
	url: "",
	album: undefined,
	videoId: "",
	playlistId: "",
};
const getImage = async (src) => {
	const result = await fetch(src);
	const buffer = await result.buffer();
	const output = nativeImage.createFromBuffer(buffer);
	if (output.isEmpty() && !src.endsWith(".jpg") && src.includes(".jpg")) { 
		return getImage(src.slice(0, src.lastIndexOf(".jpg") + 4));
	} else {
		return output;
	}
};
const handleData = async (responseText, win) => {
	const data = JSON.parse(responseText);
	if (!data) return;
	const microformat = data.microformat?.microformatDataRenderer;
	if (microformat) {
		songInfo.uploadDate = microformat.uploadDate;
		songInfo.url = microformat.urlCanonical?.split("&")[0];
		songInfo.playlistId = new URL(microformat.urlCanonical).searchParams.get("list");
		config.set("url", microformat.urlCanonical);
	}
	const videoDetails = data.videoDetails;
	if (videoDetails) {
		songInfo.title = cleanupName(videoDetails.title);
		songInfo.artist = cleanupName(videoDetails.author);
		songInfo.views = videoDetails.viewCount;
		songInfo.songDuration = videoDetails.lengthSeconds;
		songInfo.elapsedSeconds = videoDetails.elapsedSeconds;
		songInfo.isPaused = videoDetails.isPaused;
		songInfo.videoId = videoDetails.videoId;
		songInfo.album = data?.videoDetails?.album;
		const oldUrl = songInfo.imageSrc;
		songInfo.imageSrc = videoDetails.thumbnail?.thumbnails?.pop()?.url.split("?")[0];
		if (oldUrl !== songInfo.imageSrc) {
			songInfo.image = await getImage(songInfo.imageSrc);
		}
		win.webContents.send("update-song-info", JSON.stringify(songInfo));
	}
};
const callbacks = [];
const registerCallback = (callback) => {
	callbacks.push(callback);
};
let handlingData = false;
const registerProvider = (win) => {
	ipcMain.on("video-src-changed", async (_, responseText) => {
		handlingData = true;
		await handleData(responseText, win);
		handlingData = false;
		callbacks.forEach((c) => {
			c(songInfo);
		});
	});
	ipcMain.on("playPaused", (_, { isPaused, elapsedSeconds }) => {
		songInfo.isPaused = isPaused;
		songInfo.elapsedSeconds = elapsedSeconds;
		if (handlingData) return;
		callbacks.forEach((c) => {
			c(songInfo);
		});
	})
};
const suffixesToRemove = [
	" - topic",
	"vevo",
	" (performance video)",
	" (clip officiel)",
];
function cleanupName(name) {
	if (!name) return name;
	name = name.replace(/\((?:official)?[ ]?(?:music)?[ ]?(?:lyric[s]?)?[ ]?(?:video)?\)$/i, '')
	const lowCaseName = name.toLowerCase();
	for (const suffix of suffixesToRemove) {
		if (lowCaseName.endsWith(suffix)) {
			return name.slice(0, -suffix.length);
		}
	}
	return name;
}
module.exports = registerCallback;
module.exports.setupSongInfo = registerProvider;
module.exports.getImage = getImage;
module.exports.cleanupName = cleanupName;
