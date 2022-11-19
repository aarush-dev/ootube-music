const { notificationImage, icons } = require("./utils");
const getSongControls = require('../../providers/song-controls');
const registerCallback = require("../../providers/song-info");
const is = require("electron-is");
const WindowsToaster = require('node-notifier').WindowsToaster;
const notifier = new WindowsToaster({ withFallback: true });
let controls;
let notificationOnUnpause;
module.exports = (win, unpauseNotification) => {
    const { playPause, next, previous } = getSongControls(win);
    controls = { playPause, next, previous };
    notificationOnUnpause = unpauseNotification;
    let currentUrl;
    registerCallback(songInfo => {
        if (!songInfo.isPaused && (songInfo.url !== currentUrl || notificationOnUnpause)) {
            currentUrl = songInfo.url;
            sendToaster(songInfo);
        }
    });
    win.webContents.once("closed", () => {
        deleteNotification()
    });
}
let toDelete;
function deleteNotification() {
    if (toDelete !== undefined) {
        const removeNotif = Object.assign(toDelete, {
            remove: toDelete.id
        })
        notifier.notify(removeNotif)
        toDelete = undefined;
    }
}
function sendToaster(songInfo) {
    deleteNotification();
    let imgSrc = notificationImage(songInfo, true);
    toDelete = {
        appID: is.dev() ? undefined : "in.theindianschool.ootube-music",
        title: songInfo.title || "Playing",
        message: songInfo.artist,
        id: parseInt(Math.random() * 1000000, 10),
        icon: imgSrc,
        actions: [
            icons.previous,
            songInfo.isPaused ? icons.play : icons.pause,
            icons.next
        ],
        sound: false,
    };
    notifier.notify(
        toDelete,
        (err, data) => {
            if (err) {
                console.log(`ERROR = ${err.toString()}\n DATA = ${data}`);
            }
            switch (data) {
                case icons.previous.normalize():
                    controls.previous();
                    return;
                case icons.next.normalize():
                    controls.next();
                    return;
                case icons.play.normalize():
                    controls.playPause();
                    toDelete = undefined;
                    if (!notificationOnUnpause) {
                        songInfo.isPaused = false;
                        sendToaster(songInfo);
                    }
                    return;
                case icons.pause.normalize():
                    controls.playPause();
                    songInfo.isPaused = true;
                    toDelete = undefined;
                    sendToaster(songInfo);
                    return;
                case "dismissed":
                case "timeout":
                    deleteNotification();
            }
        }
    );
}
