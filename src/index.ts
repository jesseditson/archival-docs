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
});

if (DEV) {
  console.log("Dev Mode enabled");
  // ESBuild watch
  new EventSource("/esbuild").addEventListener("change", () =>
    location.reload()
  );
}
