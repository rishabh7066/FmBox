/* =====================================================================
   गाँव की यादें — YouTube IFrame Player
   ===================================================================== */

/* ---------------------------------------------------------------------
   1) PLAYLIST ID — YouTube playlist ka sirf ID yahan hai
   --------------------------------------------------------------------- */
const YT_PLAYLIST_ID = "PLYtiYVBmEbCPOnDbl8GK-per_EGGJo09K";

/* ---------------------------------------------------------------------
   2) SPOTIFY LINK — agar Spotify playlist ho toh yahan add karo
   --------------------------------------------------------------------- */
const SPOTIFY_PLAYLIST_URL = "https://open.spotify.com/playlist/YOUR_PLAYLIST_ID";
const YT_PLAYLIST_URL      = "https://youtube.com/playlist?list=" + YT_PLAYLIST_ID;

/* =====================================================================
   Platform buttons
   ===================================================================== */
document.getElementById("spotifyLink").href = SPOTIFY_PLAYLIST_URL;
document.getElementById("ytMusicLink").href  = YT_PLAYLIST_URL;

/* =====================================================================
   DOM refs
   ===================================================================== */
const playBtn      = document.getElementById("playBtn");
const playIcon     = document.getElementById("playIcon");
const pauseIcon    = document.getElementById("pauseIcon");
const prevBtn      = document.getElementById("prevBtn");
const nextBtn      = document.getElementById("nextBtn");
const seekBar      = document.getElementById("seekBar");
const currentTimeEl= document.getElementById("currentTime");
const durationEl   = document.getElementById("durationTime");
const coverArt     = document.getElementById("coverArt");
const trackTitle   = document.getElementById("trackTitle");
const trackArtist  = document.getElementById("trackArtist");
const playerCard   = document.querySelector(".player-card");

/* =====================================================================
   Helpers
   ===================================================================== */
function formatTime(sec) {
  if (!isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function setPlayingUI(playing) {
  playIcon.hidden  = playing;
  pauseIcon.hidden = !playing;
  playBtn.setAttribute("aria-label", playing ? "Pause" : "Play");
  playerCard.classList.toggle("is-playing", playing);
}

function updateTrackInfo() {
  if (!ytPlayer || typeof ytPlayer.getVideoData !== "function") return;
  try {
    const data = ytPlayer.getVideoData();
    if (data && data.title) {
      // YouTube title usually has "Song - Artist" format
      const parts = data.title.split(" - ");
      if (parts.length >= 2) {
        trackTitle.textContent  = parts.slice(1).join(" - ").trim();
        trackArtist.textContent = parts[0].trim();
      } else {
        trackTitle.textContent  = data.title;
        trackArtist.textContent = data.author || "";
      }
    }
    // Try to get thumbnail
    const videoId = data.video_id;
    if (videoId) {
      coverArt.src = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
      coverArt.alt = data.title || "";
    }
  } catch(e) {}
}

/* =====================================================================
   Seek bar polling
   ===================================================================== */
let seekInterval = null;
let isSeeking    = false;

function startSeekPolling() {
  if (seekInterval) return;
  seekInterval = setInterval(() => {
    if (isSeeking || !ytPlayer || typeof ytPlayer.getCurrentTime !== "function") return;
    try {
      const cur = ytPlayer.getCurrentTime() || 0;
      const dur = ytPlayer.getDuration()    || 0;
      currentTimeEl.textContent = formatTime(cur);
      durationEl.textContent    = formatTime(dur);
      if (dur > 0) {
        seekBar.max   = dur;
        seekBar.value = cur;
        const pct = (cur / dur) * 100;
        seekBar.style.setProperty("--progress", pct + "%");
      }
    } catch(e) {}
  }, 500);
}

function stopSeekPolling() {
  clearInterval(seekInterval);
  seekInterval = null;
}

/* =====================================================================
   YouTube IFrame API
   ===================================================================== */
let ytPlayer = null;

window.onYouTubeIframeAPIReady = function () {
  ytPlayer = new YT.Player("ytPlayer", {
    height: "1",
    width:  "1",
    playerVars: {
      listType:   "playlist",
      list:       YT_PLAYLIST_ID,
      autoplay:   0,
      controls:   0,
      enablejsapi:1,
      origin:     window.location.origin || "*"
    },
    events: {
      onReady:       onPlayerReady,
      onStateChange: onPlayerStateChange
    }
  });
};

function onPlayerReady() {
  // Load the playlist silently, don't autoplay
  ytPlayer.cuePlaylist({ listType: "playlist", list: YT_PLAYLIST_ID });
  // Update info after a moment
  setTimeout(updateTrackInfo, 800);
}

function onPlayerStateChange(event) {
  const S = YT.PlayerState;
  if (event.data === S.PLAYING) {
    setPlayingUI(true);
    startSeekPolling();
    setTimeout(updateTrackInfo, 600);
  } else if (event.data === S.PAUSED || event.data === S.ENDED) {
    setPlayingUI(false);
    if (event.data === S.ENDED) stopSeekPolling();
  } else if (event.data === S.BUFFERING) {
    setTimeout(updateTrackInfo, 400);
  }
}

/* Load YouTube API script dynamically */
(function loadYTApi() {
  const tag = document.createElement("script");
  tag.src   = "https://www.youtube.com/iframe_api";
  document.head.appendChild(tag);
})();

/* =====================================================================
   Controls
   ===================================================================== */
playBtn.addEventListener("click", () => {
  if (!ytPlayer || typeof ytPlayer.getPlayerState !== "function") return;
  const state = ytPlayer.getPlayerState();
  if (state === YT.PlayerState.PLAYING) {
    ytPlayer.pauseVideo();
  } else {
    ytPlayer.playVideo();
  }
});

prevBtn.addEventListener("click", () => {
  if (!ytPlayer) return;
  ytPlayer.previousVideo();
  setTimeout(updateTrackInfo, 800);
});

nextBtn.addEventListener("click", () => {
  if (!ytPlayer) return;
  ytPlayer.nextVideo();
  setTimeout(updateTrackInfo, 800);
});

/* Seek bar */
seekBar.addEventListener("input", () => {
  isSeeking = true;
  const val = parseFloat(seekBar.value);
  const dur = (ytPlayer && typeof ytPlayer.getDuration === "function") ? ytPlayer.getDuration() : 0;
  const pct = dur > 0 ? (val / dur) * 100 : 0;
  seekBar.style.setProperty("--progress", pct + "%");
  currentTimeEl.textContent = formatTime(val);
});

seekBar.addEventListener("change", () => {
  if (ytPlayer && typeof ytPlayer.seekTo === "function") {
    ytPlayer.seekTo(parseFloat(seekBar.value), true);
  }
  isSeeking = false;
});
