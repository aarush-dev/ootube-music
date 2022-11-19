const { ElementFromFile, templatePath } = require("../utils");
const { setOptions, isEnabled } = require("../../config/plugins");
const moveVolumeHud = isEnabled("precise-volume") ? require("../precise-volume/front").moveVolumeHud : ()=>{};
function $(selector) { return document.querySelector(selector); }
let options, player, video, api;
const switchButtonDiv = ElementFromFile(
    templatePath(__dirname, "button_template.html")
);
module.exports = (_options) => {
    if (_options.forceHide) return;
    switch (_options.mode) {
        case "native": {
            $("ytmusic-player-page").setAttribute("has-av-switcher");
            $("ytmusic-player").setAttribute("has-av-switcher");
            return;
        }
        case "disabled": {
            $("ytmusic-player-page").removeAttribute("has-av-switcher");
            $("ytmusic-player").removeAttribute("has-av-switcher");
            return;
        }
        default:
        case "custom": {
            options = _options;
            document.addEventListener("apiLoaded", setup, { once: true, passive: true });
        }
    }
};
function setup(e) {
    api = e.detail;
    player = $('ytmusic-player');
    video = $('video');
    $('ytmusic-player-page').prepend(switchButtonDiv);
    if (options.hideVideo) {
        $('.video-switch-button-checkbox').checked = false;
        changeDisplay(false);
        forcePlaybackMode();
        video.style.height = "auto";
    }
    switchButtonDiv.addEventListener('change', (e) => {
        options.hideVideo = !e.target.checked;
        changeDisplay(e.target.checked);
        setOptions("video-toggle", options);
    })
    video.addEventListener('srcChanged', videoStarted);
    observeThumbnail();
}
function changeDisplay(showVideo) {
    player.style.margin = showVideo ? '' : 'auto 0px';
    player.setAttribute('playback-mode', showVideo ? 'OMV_PREFERRED' : 'ATV_PREFERRED');
    $('#song-video.ytmusic-player').style.display = showVideo ? 'block' : 'none';
    $('#song-image').style.display = showVideo ? 'none' : 'block';
    if (showVideo && !video.style.top) {
        video.style.top = `${(player.clientHeight - video.clientHeight) / 2}px`;
    }
    moveVolumeHud(showVideo);
}
function videoStarted() {
    if (api.getPlayerResponse().videoDetails.musicVideoType !== 'MUSIC_VIDEO_TYPE_ATV') {
        forceThumbnail($('#song-image img'));
        switchButtonDiv.style.display = "initial";
        if (!options.hideVideo && $('#song-video.ytmusic-player').style.display === "none") {
            changeDisplay(true);
        } else {
            moveVolumeHud(!options.hideVideo);
        }
    } else {
        changeDisplay(false);
        switchButtonDiv.style.display = "none";
    }
}
function forcePlaybackMode() {
    const playbackModeObserver = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.target.getAttribute('playback-mode') !== "ATV_PREFERRED") {
                playbackModeObserver.disconnect();
                mutation.target.setAttribute('playback-mode', "ATV_PREFERRED");
            }
        });
    });
    playbackModeObserver.observe(player, { attributeFilter: ["playback-mode"] });
}
function observeThumbnail() {
    const playbackModeObserver = new MutationObserver(mutations => {
        if (!player.videoMode_) return;
        mutations.forEach(mutation => {
            if (!mutation.target.src.startsWith('data:')) return;
            forceThumbnail(mutation.target)
        });
    });
    playbackModeObserver.observe($('#song-image img'), { attributeFilter: ["src"] })
}
function forceThumbnail(img) {
    const thumbnails = $('#movie_player').getPlayerResponse()?.videoDetails?.thumbnail?.thumbnails;
    if (thumbnails && thumbnails.length > 0) {
        img.src = thumbnails[thumbnails.length - 1].url.split("?")[0];
    }
}
