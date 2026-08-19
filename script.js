/* =====================================================================
   गाँव की यादें — YouTube IFrame Player
   ===================================================================== */

const YT_PLAYLIST_ID       = "PLYtiYVBmEbCPOnDbl8GK-per_EGGJo09K";
const SPOTIFY_PLAYLIST_URL = "https://open.spotify.com/playlist/YOUR_PLAYLIST_ID";
const YT_PLAYLIST_URL      = "https://youtube.com/playlist?list=" + YT_PLAYLIST_ID;

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
const shuffleBtn   = document.getElementById("shuffleBtn");
const repeatBtn    = document.getElementById("repeatBtn");
const repeatBadge  = document.getElementById("repeatBadge");
const volDown      = document.getElementById("volDown");
const volUp        = document.getElementById("volUp");
const volFill      = document.getElementById("volFill");
const speedSelect  = document.getElementById("speedSelect");

/* =====================================================================
   State
   ===================================================================== */
let ytPlayer    = null;
let isSeeking   = false;
let seekInterval= null;
let isShuffleOn = false;
let repeatMode  = 0;   // 0=off  1=repeat-all  2=repeat-one
let volume      = 85;  // 0-100

/* =====================================================================
   Helpers
   ===================================================================== */
function formatTime(sec){
  if(!isFinite(sec)||sec<0) sec=0;
  const m=Math.floor(sec/60);
  const s=Math.floor(sec%60).toString().padStart(2,"0");
  return `${m}:${s}`;
}

function setPlayingUI(playing){
  playIcon.hidden  = playing;
  pauseIcon.hidden = !playing;
  playBtn.setAttribute("aria-label", playing?"Pause":"Play");
  playerCard.classList.toggle("is-playing", playing);
}

function updateTrackInfo(){
  if(!ytPlayer||typeof ytPlayer.getVideoData!=="function") return;
  try{
    const data = ytPlayer.getVideoData();
    if(data&&data.title){
      const parts = data.title.split(" - ");
      if(parts.length>=2){
        trackTitle.textContent  = parts.slice(1).join(" - ").trim();
        trackArtist.textContent = parts[0].trim();
      } else {
        trackTitle.textContent  = data.title;
        trackArtist.textContent = data.author||"";
      }
    }
    const videoId = data&&data.video_id;
    if(videoId){
      coverArt.src = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
      coverArt.alt = (data&&data.title)||"";
    }
  }catch(e){}
}

/* =====================================================================
   Seek bar polling
   ===================================================================== */
function startSeekPolling(){
  if(seekInterval) return;
  seekInterval=setInterval(()=>{
    if(isSeeking||!ytPlayer||typeof ytPlayer.getCurrentTime!=="function") return;
    try{
      const cur=ytPlayer.getCurrentTime()||0;
      const dur=ytPlayer.getDuration()||0;
      currentTimeEl.textContent=formatTime(cur);
      durationEl.textContent=formatTime(dur);
      if(dur>0){
        seekBar.max=dur;
        seekBar.value=cur;
        seekBar.style.setProperty("--progress",(cur/dur*100)+"%");
      }
    }catch(e){}
  },500);
}
function stopSeekPolling(){
  clearInterval(seekInterval);
  seekInterval=null;
}

/* =====================================================================
   Volume helpers
   ===================================================================== */
function setVolume(val){
  volume = Math.max(0, Math.min(100, val));
  if(volFill) volFill.style.width = volume + "%";
  if(ytPlayer&&typeof ytPlayer.setVolume==="function") ytPlayer.setVolume(volume);
}

/* =====================================================================
   YouTube IFrame API
   ===================================================================== */
window.onYouTubeIframeAPIReady = function(){
  ytPlayer = new YT.Player("ytPlayer",{
    height:"1", width:"1",
    playerVars:{
      listType:"playlist", list:YT_PLAYLIST_ID,
      autoplay:0, controls:0, enablejsapi:1,
      origin: window.location.origin||"*"
    },
    events:{ onReady:onPlayerReady, onStateChange:onPlayerStateChange }
  });
};

function onPlayerReady(){
  ytPlayer.cuePlaylist({listType:"playlist",list:YT_PLAYLIST_ID});
  ytPlayer.setVolume(volume);
  setTimeout(updateTrackInfo,800);
}

function onPlayerStateChange(event){
  const S=YT.PlayerState;
  if(event.data===S.PLAYING){
    setPlayingUI(true);
    startSeekPolling();
    setTimeout(updateTrackInfo,600);
  } else if(event.data===S.PAUSED){
    setPlayingUI(false);
  } else if(event.data===S.ENDED){
    setPlayingUI(false);
    stopSeekPolling();
    if(repeatMode===2){
      // repeat one — replay same
      ytPlayer.seekTo(0);
      ytPlayer.playVideo();
    } else {
      ytPlayer.nextVideo();
    }
  }
}

(function loadYTApi(){
  const tag=document.createElement("script");
  tag.src="https://www.youtube.com/iframe_api";
  document.head.appendChild(tag);
})();

/* =====================================================================
   Play / Pause
   ===================================================================== */
playBtn.addEventListener("click",()=>{
  if(!ytPlayer||typeof ytPlayer.getPlayerState!=="function") return;
  if(ytPlayer.getPlayerState()===YT.PlayerState.PLAYING){
    ytPlayer.pauseVideo();
  } else {
    ytPlayer.playVideo();
  }
});

/* Prev / Next */
prevBtn.addEventListener("click",()=>{
  if(!ytPlayer) return;
  ytPlayer.previousVideo();
  setTimeout(updateTrackInfo,800);
});
nextBtn.addEventListener("click",()=>{
  if(!ytPlayer) return;
  ytPlayer.nextVideo();
  setTimeout(updateTrackInfo,800);
});

/* =====================================================================
   Seek bar
   ===================================================================== */
seekBar.addEventListener("input",()=>{
  isSeeking=true;
  const val=parseFloat(seekBar.value);
  const dur=(ytPlayer&&typeof ytPlayer.getDuration==="function")?ytPlayer.getDuration():0;
  seekBar.style.setProperty("--progress",dur>0?(val/dur*100)+"%":"0%");
  currentTimeEl.textContent=formatTime(val);
});
seekBar.addEventListener("change",()=>{
  if(ytPlayer&&typeof ytPlayer.seekTo==="function")
    ytPlayer.seekTo(parseFloat(seekBar.value),true);
  isSeeking=false;
});

/* =====================================================================
   Shuffle
   ===================================================================== */
shuffleBtn.addEventListener("click",()=>{
  isShuffleOn=!isShuffleOn;
  shuffleBtn.classList.toggle("active",isShuffleOn);
  if(ytPlayer&&typeof ytPlayer.setShuffle==="function")
    ytPlayer.setShuffle(isShuffleOn);
});

/* =====================================================================
   Repeat — 3 states:  0=off  →  1=repeat-all  →  2=repeat-one  →  0
   ===================================================================== */
function applyRepeatUI(){
  // Reset first
  repeatBtn.classList.remove("active");
  repeatBadge.hidden = true;

  if(repeatMode===0){
    // OFF — nothing extra
  } else if(repeatMode===1){
    // Repeat ALL
    repeatBtn.classList.add("active");
    if(ytPlayer&&typeof ytPlayer.setLoop==="function") ytPlayer.setLoop(true);
  } else if(repeatMode===2){
    // Repeat ONE
    repeatBtn.classList.add("active");
    repeatBadge.hidden = false;
    if(ytPlayer&&typeof ytPlayer.setLoop==="function") ytPlayer.setLoop(false);
  }
}

repeatBtn.addEventListener("click",()=>{
  repeatMode = (repeatMode + 1) % 3;
  applyRepeatUI();
});

/* =====================================================================
   Volume +/-
   ===================================================================== */
volDown.addEventListener("click",()=> setVolume(volume-10));
volUp.addEventListener("click",()=>   setVolume(volume+10));

/* =====================================================================
   Speed
   ===================================================================== */
speedSelect.addEventListener("change",()=>{
  if(ytPlayer&&typeof ytPlayer.setPlaybackRate==="function")
    ytPlayer.setPlaybackRate(parseFloat(speedSelect.value));
});
