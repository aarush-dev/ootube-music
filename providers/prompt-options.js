const path = require("path");
const is = require("electron-is");
const { isEnabled } = require("../config/plugins");
const iconPath = path.join(__dirname, "..", "assets", "youtube-music-tray.png");
const customTitlebarPath = path.join(__dirname, "prompt-custom-titlebar.js");
const promptOptions =  {
    customStylesheet: "dark",
    icon: iconPath
};
module.exports = () => promptOptions;
