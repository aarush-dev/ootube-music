const { writeFileSync } = require("fs");
const { join } = require("path");
const ID3Writer = require("browser-id3-writer");
const { dialog, ipcMain } = require("electron");
const registerCallback = require("../../providers/song-info");
const { injectCSS, listenAction } = require("../utils");
const { cropMaxWidth } = require("./utils");
const { ACTIONS, CHANNEL } = require("./actions.js");
const { isEnabled } = require("../../config/plugins");
const { getImage } = require("../../providers/song-info");
const sendError = (win, error) => {
	win.setProgressBar(-1);
	dialog.showMessageBox({
		type: "info",
		buttons: ["OK"],
		title: "Error in download!",
		message: "Argh! Apologies, download failed…",
		detail: error.toString(),
	});
};
let nowPlayingMetadata = {};
function handle(win) {
	injectCSS(win.webContents, join(__dirname, "style.css"));
	registerCallback((info) => {
		nowPlayingMetadata = info;
	});
	listenAction(CHANNEL, (event, action, arg) => {
		switch (action) {
			case ACTIONS.ERROR:
				sendError(win, arg);
				break;
			case ACTIONS.METADATA:
				event.returnValue = JSON.stringify(nowPlayingMetadata);
				break;
			case ACTIONS.PROGRESS:
				win.setProgressBar(arg);
				break;
			default:
				console.log("Unknown action: " + action);
		}
	});
	ipcMain.on("add-metadata", async (event, filePath, songBuffer, currentMetadata) => {
		let fileBuffer = songBuffer;
		const songMetadata = currentMetadata.imageSrcYTPL ?
			{
				...currentMetadata,
				image: cropMaxWidth(await getImage(currentMetadata.imageSrcYTPL))
			} :
			{ ...nowPlayingMetadata, ...currentMetadata };
		try {
			const coverBuffer = songMetadata.image && !songMetadata.image.isEmpty() ?
				songMetadata.image.toPNG() : null;
			const writer = new ID3Writer(songBuffer);
			writer
				.setFrame("TIT2", songMetadata.title)
				.setFrame("TPE1", [songMetadata.artist]);
			if (coverBuffer) {
				writer.setFrame("APIC", {
					type: 3,
					data: coverBuffer,
					description: ""
				});
			}
			writer.addTag();
			fileBuffer = Buffer.from(writer.arrayBuffer);
		} catch (error) {
			sendError(win, error);
		}
		writeFileSync(filePath, fileBuffer);
		event.reply("add-metadata-done");
	});
}
module.exports = handle;
module.exports.sendError = sendError;
