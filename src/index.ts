window.addEventListener("load", () => {
  // setupHeaderVideos();
  setupMobileMenu();
  setupQuickSearch();

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

type SearchResultsRaw = {
  sections: [
    {
      path: string;
      docTitle: string;
      sectionTitle: string | null;
      content: string;
    }
  ];
};

type SearchResult = SearchResultsRaw["sections"][0] & {
  oTitle: string;
  oSection: string | null;
};

type ResultMatch = SearchResult & {
  snippet: string;
  startIndex: number;
  matchLen: number;
};

const MAX_RESULTS = 5;
const SNIPPET_PREFIX = 10;
const SNIPPPET_SIZE = 100;

const stripHTML = (s: string) => {
  const tmp = document.createElement("div");
  tmp.innerHTML = s;
  return tmp.textContent || tmp.innerText || "";
};

const setupQuickSearch = async () => {
  const searchResults = (await (
    await fetch("/api/docs.json")
  ).json()) as SearchResultsRaw;
  const sections: SearchResult[] = searchResults.sections.map((_s) => {
    const s: SearchResult = {
      ..._s,
      oTitle: _s.docTitle,
      oSection: _s.sectionTitle,
    };
    s.content = stripHTML(decodeURIComponent(s.content).toLowerCase());
    s.docTitle = s.docTitle.toLowerCase();
    s.sectionTitle = s.sectionTitle?.toLowerCase() || null;
    return s;
  });
  // TODO if this is too slow we can switch to a trie-based approach or simplify
  // the content by adding a non-parsed markdown output to sections
  const showSearch = () => {
    modal.classList.toggle("hidden", false);
    input.focus();
  };
  const hideSearch = () => {
    modal.classList.toggle("hidden", true);
  };
  document.addEventListener("keydown", (e) => {
    if (e.key === "k" && e.metaKey) {
      showSearch();
    }
    if (e.key === "Escape") {
      hideSearch();
    }
  });
  window.addEventListener("hashchange", hideSearch);
  const modal = document.querySelector("#quick-search") as HTMLDivElement;
  const resultsEl = document.querySelector("#results") as HTMLUListElement;
  const emptyResult = document.querySelector("#results-empty") as HTMLLIElement;
  const notFoundResult = document.querySelector(
    "#results-none"
  ) as HTMLLIElement;
  const result = document.querySelector("#results-result") as HTMLLIElement;
  const input = document.querySelector(
    "#quick-search-input"
  ) as HTMLInputElement;
  document
    .querySelector("#quick-search-button")
    ?.addEventListener("click", showSearch);
  let selectedIndex = -1;
  let currentResults: ResultMatch[] = [];
  input.addEventListener("keydown", (e) => {
    switch (e.key) {
      case "Enter":
        hideSearch();
        if (selectedIndex > -1) {
          window.location.href = currentResults[selectedIndex].path;
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        selectedIndex = (selectedIndex - 1) % currentResults.length;
        break;
      case "ArrowDown":
        e.preventDefault();
        selectedIndex = (selectedIndex + 1) % currentResults.length;
        break;
      default:
        return;
    }
    resultsEl.querySelectorAll(".result").forEach((r, idx) => {
      r.classList.toggle("bg-gray-light", idx === selectedIndex);
    });
  });
  input.addEventListener("input", () => {
    resultsEl.innerHTML = "";
    selectedIndex = -1;
    const terms = input.value.split(/\s+/).map((t) => t.toLowerCase());
    if (!terms.length) {
      const r = emptyResult.cloneNode(true) as HTMLLIElement;
      r.classList.toggle("hidden", false);
      resultsEl.appendChild(r);
      return;
    }
    const results: ResultMatch[] = [];
    const getMatchIdx = (t: string, s: string): [false | number, string] => {
      const idx = s.indexOf(t);
      if (idx === -1) {
        return [false, ""];
      }
      const snipStart = Math.max(idx - SNIPPET_PREFIX, 0);
      const snippet = s.slice(snipStart, snipStart + SNIPPPET_SIZE);
      return [idx - snipStart, snippet];
    };
    for (const s of sections) {
      for (const t of terms) {
        let [startIndex, snippet] = getMatchIdx(t, s.docTitle);
        if (!startIndex && s.sectionTitle) {
          [startIndex, snippet] = getMatchIdx(t, s.sectionTitle);
        }
        if (!startIndex && s.content) {
          [startIndex, snippet] = getMatchIdx(t, s.content);
        }
        if (startIndex !== false) {
          results.push({
            ...s,
            startIndex,
            snippet,
            matchLen: t.length,
          });
          // If we find any term, stop searching since we'll include this section
          break;
        }
      }
      if (results.length >= MAX_RESULTS) {
        break;
      }
    }
    currentResults = results;
    if (results.length === 0) {
      const r = notFoundResult.cloneNode(true) as HTMLLIElement;
      r.classList.toggle("hidden", false);
      resultsEl.appendChild(r);
      return;
    }
    results.forEach((r) => {
      const rEl = result.cloneNode(true) as HTMLLIElement;
      rEl.classList.toggle("hidden", false);
      (rEl.querySelector(".doc-page") as HTMLElement).innerText = r.oTitle;
      const sectionEl = rEl.querySelector(".doc-section") as HTMLElement;
      if (r.oSection) {
        sectionEl.innerText = r.oSection;
      } else {
        rEl.querySelector(".match")?.removeChild(sectionEl);
      }
      (rEl.querySelector(".link") as HTMLAnchorElement).href = r.path;
      const pre = r.snippet.slice(0, r.startIndex);
      const hl = r.snippet.slice(r.startIndex, r.startIndex + r.matchLen);
      const rest = r.snippet.slice(r.startIndex + r.matchLen);
      rEl.querySelector(".snippet-pre")!.innerHTML = pre;
      rEl.querySelector(".snippet-hl")!.innerHTML = hl;
      rEl.querySelector(".snippet-rest")!.innerHTML = rest;
      resultsEl.appendChild(rEl);
    });
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
