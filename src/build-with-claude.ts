// Launcher for the self-serve "build with Claude" flow. Clicking through runs a
// Turnstile challenge, then asks the API for a preview name and a publish token
// scoped to it; both ride into the Claude Code session inside the prompt.

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
  token: string;
  url: string;
  archivalVersion: string;
  expiresAt: string;
};

const el = <T extends HTMLElement>(id: string): T =>
  document.getElementById(id) as T;

const buildPrompt = (start: StartResponse): string => {
  const prompt = [
    "Build me an Archival website.",
    "",
    "Read https://archival.dev/agent/build-site.md and follow it exactly.",
    `Publish token: ${start.token}`,
    `Preview name: ${start.name}`,
    `Archival version: ${start.archivalVersion}`,
  ].join("\n");
  return prompt.length > MAX_PROMPT ? prompt.slice(0, MAX_PROMPT) : prompt;
};

const setup = () => {
  const launch = el<HTMLButtonElement>("bwc-launch");
  if (!launch) {
    return;
  }
  const error = el<HTMLParagraphElement>("bwc-error");

  let widgetId: string | null = null;
  let running = false;

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
        body: JSON.stringify({ turnstileToken: token }),
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
      // Single-quoted for the shell; the prompt is ours, so nothing in it needs
      // escaping beyond the quote itself.
      el("bwc-command").textContent =
        `claude --cloud '${prompt.replace(/'/g, `'\\''`)}'`;
      el("bwc-result").hidden = false;

      // A claude-cli:// navigation does not leave the page, so the fallback
      // above is revealed first and stays on screen for anyone whose machine
      // has no handler registered.
      window.location.href = `claude-cli://open?q=${encodeURIComponent(prompt)}`;
      launch.disabled = false;
      running = false;
    } catch {
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
      // Hold the challenge until the click, and keep the widget out of the page
      // unless Turnstile decides this visitor has to interact with it.
      execution: "render",
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

  el<HTMLButtonElement>("bwc-copy").addEventListener("click", async () => {
    await navigator.clipboard.writeText(el("bwc-command").textContent ?? "");
    const button = el<HTMLButtonElement>("bwc-copy");
    button.textContent = "Copied";
    setTimeout(() => (button.textContent = "Copy"), 2000);
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
