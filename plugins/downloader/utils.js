const electron = require("electron");
const is = require('electron-is');
module.exports.getFolder = customFolder => customFolder || electron.app.getPath("downloads");
module.exports.defaultMenuDownloadLabel = "Download playlist";
const orderedQualityList = ["maxresdefault", "hqdefault", "mqdefault", "sdddefault"];
module.exports.urlToJPG = (imgUrl, videoId) => {
	if (!imgUrl || imgUrl.includes(".jpg")) return imgUrl;
	for (const quality of orderedQualityList) {
		if (imgUrl.includes(quality)) {
			return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
		}
	}
	return `https://img.youtube.com/vi/${videoId}/default.jpg`;
}
module.exports.cropMaxWidth = (image) => {
	const imageSize = image.getSize();
	if (imageSize.width === 1280 && imageSize.height === 720) {
		return image.crop({
			x: 280,
			y: 0,
			width: 720,
			height: 720
		});
	}
	return image;
}
module.exports.presets = {
	"None (defaults to mp3)": undefined,
	opus: {
		extension: "opus",
		ffmpegArgs: ["-acodec", "libopus"],
	},
};
module.exports.setBadge = n => {
	if (is.linux() || is.macOS()) {
		electron.app.setBadgeCount(n);
	}
}
