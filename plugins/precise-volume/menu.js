const { enabled } = require("./back");
const { setMenuOptions } = require("../../config/plugins");
const prompt = require("custom-electron-prompt");
const promptOptions = require("../../providers/prompt-options");
function changeOptions(changedOptions, options, win) {
	for (option in changedOptions) {
		options[option] = changedOptions[option];
	}
	if (enabled()) {
		win.webContents.send("setOptions", changedOptions);
	} else {
		setMenuOptions("precise-volume", options);
	}
}
module.exports = (win, options) => [
	{
		label: "Local Arrowkeys Controls",
		type: "checkbox",
		checked: !!options.arrowsShortcut,
		click: item => {
			changeOptions({ arrowsShortcut: item.checked }, options, win);
		}
	},
	{
		label: "Global Hotkeys",
		type: "checkbox",
		checked: !!options.globalShortcuts.volumeUp || !!options.globalShortcuts.volumeDown,
		click: item => promptGlobalShortcuts(win, options, item)
	},
	{
		label: "Set Custom Volume Steps",
		click: () => promptVolumeSteps(win, options)
	}
];
const kb = (label_, value_, default_) => { return { value: value_, label: label_, default: default_ || undefined }; };
async function promptVolumeSteps(win, options) {
	const output = await prompt({
		title: "Volume Steps",
		label: "Choose Volume Increase/Decrease Steps",
		value: options.steps || 1,
		type: "counter",
		counterOptions: { minimum: 0, maximum: 100, multiFire: true },
		width: 380,
		...promptOptions()
	}, win)
	if (output || output === 0) {
		changeOptions({ steps: output}, options, win);
	}
}
async function promptGlobalShortcuts(win, options, item) {
	const output = await prompt({
		title: "Global Volume Keybinds",
		label: "Choose Global Volume Keybinds:",
		type: "keybind",
		keybindOptions: [
			kb("Increase Volume", "volumeUp", options.globalShortcuts?.volumeUp),
			kb("Decrease Volume", "volumeDown", options.globalShortcuts?.volumeDown)
		],
		...promptOptions()
	}, win)
	if (output) {
		let newGlobalShortcuts = {};
		for (const { value, accelerator } of output) {
			newGlobalShortcuts[value] = accelerator;
		}
		changeOptions({ globalShortcuts: newGlobalShortcuts }, options, win);
		item.checked = !!options.globalShortcuts.volumeUp || !!options.globalShortcuts.volumeDown;
	} else {
		item.checked = !item.checked;
	}
}
