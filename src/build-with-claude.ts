// Launcher for the self-serve "build with Claude" flow. Clicking through runs a
// Turnstile challenge, then asks the API for a preview name and a session handle
// scoped to it. The session rides into the Claude Code session inside the prompt;
// the publish token it stands for never leaves the API.

declare global {
  interface Window {
    turnstile?: {
      render(
        el: HTMLElement,
        options: {
          sitekey: string;
          action?: string;
          execution?: "render" | "execute";
          appearance?: "always" | "execute" | "interaction-only";
          callback: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
        },
      ): string;
      execute(container: HTMLElement | string): void;
      reset(widgetId: string): void;
    };
    umami?: { track: (event: string) => void };
  }
}

const TURNSTILE_ACTION = "build-with-claude";
// `q` is capped at 5,000 characters by Claude Code's deep link handler.
const MAX_PROMPT = 5000;

type StartResponse = {
  name: string;
  session: string;
  url: string;
  expiresAt: string;
};

// The same prompt, opened in a Claude Code session in the cloud rather than on
// this machine. An https link, so it also survives anywhere a custom scheme is
// stripped.
const CLOUD_SESSION = "https://claude.ai/code/new";

const SKILL_URL =
  "https://raw.githubusercontent.com/archival-dev/archival/main/plugins/archival/skills/new/SKILL.md";

const el = <T extends HTMLElement>(id: string): T =>
  document.getElementById(id) as T;

const buildPrompt = (start: StartResponse): string => {
  const prompt = [
    "Build me an Archival website.",
    "",
    `Read ${SKILL_URL} and follow it exactly.`,
    `Session: ${start.session}`,
    "",
    "Use the archival MCP tools if you have them; otherwise follow",
    "reference/publishing.md next to that file. Nothing needs to be installed.",
    "If you do end up writing files on this machine, make a new directory for",
    "them rather than working wherever this session happened to open.",
  ].join("\n");
  return prompt.length > MAX_PROMPT ? prompt.slice(0, MAX_PROMPT) : prompt;
};

// navigator.clipboard is undefined outside a secure context, so a plain call
// throws rather than failing gracefully. The textarea goes inside the dialog:
// showModal() makes everything outside it inert, and a selection there cannot
// be copied.
const writeClipboard = async (text: string): Promise<void> => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const host = el<HTMLDialogElement>("bwc-modal");
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "absolute";
  area.style.opacity = "0";
  host.appendChild(area);
  area.select();
  try {
    if (!document.execCommand("copy")) {
      throw new Error("copy rejected");
    }
  } finally {
    host.removeChild(area);
  }
};

const openModal = () => {
  const modal = el<HTMLDialogElement>("bwc-modal");
  modal.showModal();
};

const setup = () => {
  const launch = el<HTMLButtonElement>("bwc-launch");
  if (!launch) {
    return;
  }
  const error = el<HTMLParagraphElement>("bwc-error");

  let widgetId: string | null = null;
  let running = false;
  let promptText = "";

  const fail = (message: string) => {
    error.textContent = message;
    error.hidden = false;
    launch.disabled = false;
    running = false;
    // A token is spent whether or not the response it came with was accepted,
    // so a retry needs a fresh challenge.
    if (widgetId && window.turnstile) {
      window.turnstile.reset(widgetId);
    }
  };

  const start = async (token: string) => {
    try {
      const response = await fetch(`${API_URL}/previews/self-serve/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // `mcp` asks for a session handle alongside the grant. The challenge has
        // already been cleared here, so it comes back approved.
        body: JSON.stringify({ turnstileToken: token, mcp: true }),
      });
      if (!response.ok) {
        fail(
          response.status === 429
            ? "Too many requests from this network. Try again in a minute."
            : "That didn't work. Please try again.",
        );
        return;
      }
      const result = (await response.json()) as StartResponse;
      const prompt = buildPrompt(result);

      el("bwc-name").textContent = result.name;
      el<HTMLAnchorElement>("bwc-cloud").href =
        `${CLOUD_SESSION}?q=${encodeURIComponent(prompt)}`;
      // Held rather than rendered: it is pasted into an editor, so it is copied
      // verbatim - no shell quoting, which would put literal '\'' sequences
      // into someone's prompt.
      promptText = prompt;

      openModal();
      window.location.href = `claude-cli://open?q=${encodeURIComponent(prompt)}`;
      launch.disabled = false;
      running = false;
    } catch (e) {
      console.error(e);
      fail("Couldn't reach Archival. Check your connection and try again.");
    }
  };

  const renderWidget = () => {
    if (!window.turnstile) {
      return;
    }
    widgetId = window.turnstile.render(el("bwc-turnstile"), {
      sitekey: TURNSTILE_SITE_KEY,
      action: TURNSTILE_ACTION,
      execution: "execute",
      appearance: "interaction-only",
      callback: (token) => {
        void start(token);
      },
      "error-callback": () => {
        fail("The challenge failed. Please try again.");
      },
      "expired-callback": () => {
        fail("The challenge expired. Please try again.");
      },
    });
  };

  el<HTMLButtonElement>("bwc-close").addEventListener("click", () => {
    el<HTMLDialogElement>("bwc-modal").close();
  });

  el<HTMLDialogElement>("bwc-modal").addEventListener("close", () => {
    if (widgetId && window.turnstile) {
      window.turnstile.reset(widgetId);
    }
  });

  let revertCopy: ReturnType<typeof setTimeout> | undefined;

  el<HTMLButtonElement>("bwc-copy").addEventListener("click", async () => {
    const button = el<HTMLButtonElement>("bwc-copy");
    const label = el("bwc-copy-label");
    const status = el("bwc-copy-status");
    clearTimeout(revertCopy);
    try {
      await writeClipboard(promptText);
      button.classList.add("copied");
      label.textContent = "Copied";
      status.textContent = "Prompt copied to your clipboard.";
    } catch {
      // Never silent: the whole point of this button is to be the way out when
      // the deep link did nothing.
      status.textContent =
        "Couldn't copy automatically — select the prompt and copy it.";
      return;
    }
    revertCopy = setTimeout(() => {
      button.classList.remove("copied");
      label.textContent = "Copy prompt";
      status.textContent = "";
    }, 2000);
  });

  launch.addEventListener("click", () => {
    if (running) {
      return;
    }
    if (!widgetId || !window.turnstile) {
      fail("Couldn't load the challenge. Please reload the page.");
      return;
    }
    running = true;
    error.hidden = true;
    launch.disabled = true;
    window.umami?.track("bwc-start");
    // execute() is documented against the container, not the widget id.
    window.turnstile.execute(el("bwc-turnstile"));
  });

  renderWidget();
};

// Turnstile's script is loaded async, so it may not have defined
// window.turnstile yet; onloadTurnstileCallback is how it announces itself.
(
  window as unknown as { onloadTurnstileCallback?: () => void }
).onloadTurnstileCallback = setup;
if (window.turnstile) {
  setup();
}

export {};
