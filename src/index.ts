window.addEventListener("load", () => {
  // setupHeaderVideos();
  setupMobileMenu();

  let needsUpdate = true;
  const update = () => {
    if (needsUpdate) {
      needsUpdate = false;
      updateShadowImages();
    }
  };
  const debouncedUpdate = () => {
    needsUpdate = true;
    requestAnimationFrame(update);
  };
  window.addEventListener("scroll", debouncedUpdate);
  window.addEventListener("resize", debouncedUpdate);
  update();
});

// Factor by which to offset shadow
const SHADOW_DISTANCE = 20;
const updateShadowImages = () => {
  const viewH = window.innerHeight;
  document.querySelectorAll(".shadow-image").forEach((img, i) => {
    const shadow = img.querySelector(".bg") as HTMLImageElement;
    const { top, height } = img.getBoundingClientRect();
    const topDistance = top + height / 2;
    const center = topDistance / viewH;
    // Shadow move in the inverse direction of scroll, on a logarithmic curve
    const size = center * SHADOW_DISTANCE;
    const yShift = Math.log(size) * SHADOW_DISTANCE;
    shadow.style.transform = `translateY(${yShift - SHADOW_DISTANCE}px)`;
  });
};

const setupMobileMenu = () => {
  const menu = document.querySelector("#mobile-menu") as HTMLDivElement;
  const nav = document.querySelector("nav") as HTMLDivElement;
  const [closedMenu, openMenu] = [
    document.querySelector("#menu-closed"),
    document.querySelector("#menu-open"),
  ];
  const toggleMenu = (open: boolean) => {
    closedMenu?.classList.toggle("hidden", open);
    openMenu?.classList.toggle("hidden", !open);
    menu.classList.toggle("translate-y-0", open);
    nav.classList.toggle("shadow-up", !open);
  };
  closedMenu?.addEventListener("click", () => {
    toggleMenu(true);
  });
  openMenu?.addEventListener("click", () => {
    toggleMenu(false);
  });
};

// const setupHeaderVideos = () => {
//   const hi = document.getElementById("header-image") as HTMLDivElement;
//   const headerLogo = document.getElementById("header-logo") as HTMLDivElement;
//   const headerVideos = document.querySelectorAll(
//     ".header-video"
//   ) as NodeListOf<HTMLVideoElement>;
//   let loadedCount = 0;
//   let ci = 0;
//   let cv = headerVideos.item(ci);
//   let playing = false;
//   const setupHandlersIfLoaded = () => {
//     if (loadedCount >= headerVideos.length) {
//       console.log("header ready");
//       hi.classList.toggle("hidden", true);
//       cv.classList.toggle("hidden", false);
//       cv.currentTime = 0.25;
//       headerLogo.addEventListener("click", () => {
//         if (playing) {
//           return;
//         }
//         cv.classList.toggle("hidden", true);
//         ci = ++ci % headerVideos.length;
//         cv = headerVideos.item(ci);
//         cv.classList.toggle("hidden", false);
//         cv.currentTime = 0;
//         cv.play();
//         playing = true;
//       });
//     }
//   };
//   headerVideos.forEach((hv) => {
//     if (hv.readyState >= 3) {
//       loadedCount++;
//     }
//     hv.classList.toggle("hidden", true);
//     hv.addEventListener("load", () => {
//       loadedCount++;
//       setupHandlersIfLoaded();
//     });
//     hv.addEventListener("ended", () => {
//       playing = false;
//     });
//   });
//   setupHandlersIfLoaded();
// };

if (DEV) {
  console.log("Dev Mode enabled");
  // ESBuild watch
  new EventSource("/esbuild").addEventListener("change", () =>
    location.reload()
  );
}
