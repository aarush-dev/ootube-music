const defaultConfig = {
	"window-size": {
		width: 1100,
		height: 550,
	},
	url: "https://music.youtube.com",
	options: {
		tray: true,
		appVisible: true,
		autoUpdates: true,
		hideMenu: true,
		startAtLogin: true,
		disableHardwareAcceleration: false,
		restartOnConfigChanges: false,
		trayClickPlayPause: false,
		autoResetAppCache: false,
		resumeOnStart: true,
		proxy: "",
	},
	plugins: {
		navigation: {
			enabled: true,
		},
		adblocker: {
			enabled: true,
			cache: true,
			additionalBlockLists: []
		},
		downloader: {
			enabled: true,
			ffmpegArgs: [],
			downloadFolder: undefined, 
			preset: "mp3",
		},
		discord: {
			enabled: true,
			activityTimoutEnabled: true,
			activityTimoutTime: 10 * 60 * 1000,
			listenAlong: true,
			hideDurationLeft: false, },
		notifications: {
			enabled: true,
			unpauseNotification: true,
			urgency: "normal", 
			interactive: true
		},
		"precise-volume": {
			enabled: true,
			steps: 1,
			arrowsShortcut: true, 
			globalShortcuts: {
				volumeUp: "",
				volumeDown: ""
			},
			savedVolume: undefined 
		},
		sponsorblock: {
			enabled: true,
			apiURL: "https://sponsor.ajay.app",
			categories: [
				"sponsor",
				"intro",
				"outro",
				"interaction",
				"selfpromo",
				"music_offtopic",
			],
		},
		"video-toggle": {
			enabled: true,
			mode: "native",
			forceHide: false,
		},
		"picture-in-picture": {
			"enabled": true,
			"alwaysOnTop": true,
			"savePosition": true,
			"saveSize": true,
			"hotkey": "P"
		},
	},
};

module.exports = defaultConfig;
