import { init } from "./3d";

window.addEventListener("load", () => {
  const canvas = document.getElementById("3d") as HTMLCanvasElement | undefined;
  if (canvas) {
    const render = init(
      canvas,
      Array.from(document.getElementsByClassName("section")) as HTMLElement[],
      {
        logo: document.querySelector("#header-logo") as HTMLElement,
      }
    );
    const tick = (time: DOMHighResTimeStamp) => {
      render(time);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  setupHeaderVideos();
});

const setupHeaderVideos = () => {
  console.log("setup");
  const hi = document.getElementById("header-image") as HTMLDivElement;
  const headerLogo = document.getElementById("header-logo") as HTMLDivElement;
  const headerVideos = document.querySelectorAll(
    ".header-video"
  ) as NodeListOf<HTMLVideoElement>;
  let loadedCount = 0;
  let ci = 0;
  let cv = headerVideos.item(ci);
  let playing = false;
  const setupHandlersIfLoaded = () => {
    if (loadedCount >= headerVideos.length) {
      console.log("header ready");
      hi.classList.toggle("hidden", true);
      cv.classList.toggle("hidden", false);
      cv.currentTime = 0.25;
      headerLogo.addEventListener("click", () => {
        if (playing) {
          return;
        }
        cv.classList.toggle("hidden", true);
        ci = ++ci % headerVideos.length;
        cv = headerVideos.item(ci);
        cv.classList.toggle("hidden", false);
        cv.currentTime = 0;
        cv.play();
        playing = true;
      });
    }
  };
  headerVideos.forEach((hv) => {
    if (hv.readyState >= 3) {
      loadedCount++;
    }
    hv.classList.toggle("hidden", true);
    hv.addEventListener("load", () => {
      loadedCount++;
      setupHandlersIfLoaded();
    });
    hv.addEventListener("ended", () => {
      playing = false;
    });
  });
  setupHandlersIfLoaded();
};

if (DEV) {
  console.log("Dev Mode enabled");
  // ESBuild watch
  new EventSource("/esbuild").addEventListener("change", () =>
    location.reload()
  );
}
