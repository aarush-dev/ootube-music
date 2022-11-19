const { ipcRenderer } = require("electron");
const { setOptions, setMenuOptions, isEnabled } = require("../../config/plugins");
function $(selector) { return document.querySelector(selector); }
let api, options;
module.exports = (_options) => {
	options = _options;
	document.addEventListener('apiLoaded', e => {
		api = e.detail;
		ipcRenderer.on('changeVolume', (_, toIncrease) => changeVolume(toIncrease));
		ipcRenderer.on('setVolume', (_, value) => setVolume(value));
		firstRun();
	}, { once: true, passive: true })
};
module.exports.moveVolumeHud = moveVolumeHud;
function firstRun() {
	if (typeof options.savedVolume === "number") {
		setTooltip(options.savedVolume);
		if (api.getVolume() !== options.savedVolume) {
			api.setVolume(options.savedVolume);
		}
	}
	setupPlaybar();
	setupLocalArrowShortcuts();
	const noVid = $("#main-panel")?.computedStyleMap().get("display").value === "none";
	injectVolumeHud(noVid);
	if (!noVid) {
		setupVideoPlayerOnwheel();
		if (!isEnabled('video-toggle')) {
			const videoMode = () => api.getPlayerResponse().videoDetails?.musicVideoType !== 'MUSIC_VIDEO_TYPE_ATV';
			$("video").addEventListener("srcChanged", () => moveVolumeHud(videoMode()));
		}
	}
	ipcRenderer.on("setOptions", (_event, newOptions = {}) => {
		Object.assign(options, newOptions)
		setMenuOptions("precise-volume", options);
	});
}
function injectVolumeHud(noVid) {
	if (noVid) {
		const position = "top: 18px; right: 60px;";
		const mainStyle = "font-size: xx-large;";
		$(".center-content.ytmusic-nav-bar").insertAdjacentHTML("beforeend",
			`<span id="volumeHud" style="${position + mainStyle}"></span>`)
	} else {
		const position = `top: 10px; left: 10px;`;
		const mainStyle = "font-size: xxx-large; webkit-text-stroke: 1px black; font-weight: 600;";
		$("#song-video").insertAdjacentHTML('afterend',
			`<span id="volumeHud" style="${position + mainStyle}"></span>`)
	}
}
let hudMoveTimeout;
function moveVolumeHud(showVideo) {
	clearTimeout(hudMoveTimeout);
	const volumeHud = $('#volumeHud');
	if (!volumeHud) return;
	hudMoveTimeout = setTimeout(() => {
		volumeHud.style.top = showVideo ? `${($('ytmusic-player').clientHeight - $('video').clientHeight) / 2}px` : 0;
	}, 250)
}
let hudFadeTimeout;
function showVolumeHud(volume) {
	let volumeHud = $("#volumeHud");
	if (!volumeHud) return;
	volumeHud.textContent = volume + '%';
	volumeHud.style.opacity = 1;
	if (hudFadeTimeout) {
		clearTimeout(hudFadeTimeout);
	}
	hudFadeTimeout = setTimeout(() => {
		volumeHud.style.opacity = 0;
		hudFadeTimeout = null;
	}, 2000);
}
function setupVideoPlayerOnwheel() {
	$("#main-panel").addEventListener("wheel", event => {
		event.preventDefault();
		changeVolume(event.deltaY < 0);
	});
}
function saveVolume(volume) {
	options.savedVolume = volume;
	writeOptions();
}
let writeTimeout;
function writeOptions() {
	if (writeTimeout) clearTimeout(writeTimeout);
	writeTimeout = setTimeout(() => {
		setOptions("precise-volume", options);
		writeTimeout = null;
	}, 1000)
}
function setupPlaybar() {
	const playerbar = $("ytmusic-player-bar");
	playerbar.addEventListener("wheel", event => {
		event.preventDefault();
		changeVolume(event.deltaY < 0);
	});
	playerbar.addEventListener("mouseenter", () => {
		playerbar.classList.add("on-hover");
	});
	playerbar.addEventListener("mouseleave", () => {
		playerbar.classList.remove("on-hover");
	});
	setupSliderObserver();
}
function setupSliderObserver() {
	const sliderObserver = new MutationObserver(mutations => {
		for (const mutation of mutations) {
			if (mutation.oldValue !== mutation.target.value &&
				(typeof options.savedVolume !== "number" || Math.abs(options.savedVolume - mutation.target.value) > 4)) {
				setTooltip(mutation.target.value);
				saveVolume(mutation.target.value);
			}
		}
	});
	sliderObserver.observe($("#volume-slider"), {
		attributeFilter: ["value"],
		attributeOldValue: true
	});
}
function setVolume(value) {
	api.setVolume(value);
	saveVolume(value);
	updateVolumeSlider();
	setTooltip(value);
	showVolumeSlider();
	showVolumeHud(value);
}
function changeVolume(toIncrease) {
	const steps = Number(options.steps || 1);
	setVolume(toIncrease ?
				Math.min(api.getVolume() + steps, 100) :
				Math.max(api.getVolume() - steps, 0));
}
function updateVolumeSlider() {
	for (const slider of ["#volume-slider", "#expand-volume-slider"]) {
		$(slider).value =
			options.savedVolume > 0 && options.savedVolume < 5
				? 5
				: options.savedVolume;
	}
}
let volumeHoverTimeoutID;
function showVolumeSlider() {
	const slider = $("#volume-slider");
	slider.classList.add("on-hover");
	if (volumeHoverTimeoutID) {
		clearTimeout(volumeHoverTimeoutID);
	}
	volumeHoverTimeoutID = setTimeout(() => {
		volumeHoverTimeoutID = null;
		if (!$("ytmusic-player-bar").classList.contains("on-hover")) {
			slider.classList.remove("on-hover");
		}
	}, 3000);
}
const tooltipTargets = [
	"#volume-slider",
	"tp-yt-paper-icon-button.volume",
	"#expand-volume-slider",
	"#expand-volume"
];
function setTooltip(volume) {
	for (target of tooltipTargets) {
		$(target).title = `${volume}%`;
	}
}
function setupLocalArrowShortcuts() {
	if (options.arrowsShortcut) {
		window.addEventListener('keydown', (event) => {
			switch (event.code) {
				case "ArrowUp":
					event.preventDefault();
					changeVolume(true);
					break;
				case "ArrowDown":
					event.preventDefault();
					changeVolume(false);
					break;
			}
		});
	}
}
