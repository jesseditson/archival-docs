(function () {
  const attachListeners = () => {
    const button = document.getElementsByClassName("menu-toggle")[0];
    button.addEventListener("click", () => {
      button.classList.toggle("open");
      document.getElementsByClassName("nav")[0].classList.toggle("open");
    });
  };
  window.addEventListener("load", attachListeners);
})();
