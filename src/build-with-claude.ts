// Launcher for the self-serve "build with Claude" flow. The visitor solves a
// Turnstile challenge here, before any agent session exists; the API answers
// with a preview name and a publish token scoped to it, and both ride into the
// session inside the prompt.

declare global {
  interface Window {
    turnstile?: {
      render(
        el: HTMLElement,
        options: {
          sitekey: string;
          action?: string;
          callback: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
        },
      ): string;
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

const buildPrompt = (start: StartResponse, brief: string): string => {
  const lines = [
    "Build me an Archival website.",
    "",
    "Read https://archival.dev/agent/build-site.md and follow it exactly.",
    `Publish token: ${start.token}`,
    `Preview name: ${start.name}`,
    `Archival version: ${start.archivalVersion}`,
  ];
  if (brief) {
    lines.push("", `What I want: ${brief}`);
  }
  const prompt = lines.join("\n");
  // Trimming the brief rather than the instructions: without those the session
  // has a token and no idea what to do with it.
  return prompt.length > MAX_PROMPT ? prompt.slice(0, MAX_PROMPT) : prompt;
};

const setup = () => {
  const form = el<HTMLFormElement>("bwc-form");
  if (!form) {
    return;
  }
  const submit = el<HTMLButtonElement>("bwc-submit");
  const error = el<HTMLParagraphElement>("bwc-error");
  const brief = el<HTMLTextAreaElement>("bwc-brief");

  let token: string | null = null;
  let widgetId: string | null = null;

  const fail = (message: string) => {
    error.textContent = message;
    error.hidden = false;
    submit.disabled = false;
    // A token is spent whether or not we accepted the response it came with, so
    // a retry needs a fresh challenge.
    token = null;
    if (widgetId && window.turnstile) {
      window.turnstile.reset(widgetId);
    }
  };

  const renderWidget = () => {
    if (!window.turnstile) {
      return;
    }
    widgetId = window.turnstile.render(el("bwc-turnstile"), {
      sitekey: TURNSTILE_SITE_KEY,
      action: TURNSTILE_ACTION,
      callback: (t) => {
        token = t;
      },
      "error-callback": () => {
        token = null;
      },
      "expired-callback": () => {
        token = null;
      },
    });
  };

  const show = (start: StartResponse) => {
    const prompt = buildPrompt(start, brief.value.trim());
    el("bwc-name").textContent = start.name;

    const deeplink = el<HTMLAnchorElement>("bwc-deeplink");
    deeplink.href = `claude-cli://open?q=${encodeURIComponent(prompt)}`;
    deeplink.removeAttribute("aria-disabled");
    deeplink.removeAttribute("tabindex");

    // Single-quoted for the shell, so the only thing that needs escaping is a
    // quote the visitor typed into their brief.
    el("bwc-command").textContent =
      `claude --cloud '${prompt.replace(/'/g, `'\\''`)}'`;

    form.hidden = true;
    el("bwc-reserved").hidden = false;
    el("bwc-step-brief").dataset.state = "done";
    el("bwc-step-launch").dataset.state = "active";
    deeplink.focus();
  };

  el<HTMLButtonElement>("bwc-copy").addEventListener("click", async () => {
    await navigator.clipboard.writeText(el("bwc-command").textContent ?? "");
    const button = el<HTMLButtonElement>("bwc-copy");
    button.textContent = "Copied";
    setTimeout(() => (button.textContent = "Copy"), 2000);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!token) {
      fail("Please complete the challenge first.");
      return;
    }
    error.hidden = true;
    submit.disabled = true;
    window.umami?.track("bwc-start");

    try {
      const response = await fetch(`${API_URL}/previews/self-serve/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          turnstileToken: token,
          slug: brief.value.trim().slice(0, 60),
        }),
      });
      if (!response.ok) {
        fail(
          response.status === 429
            ? "Too many requests from this network. Try again in a minute."
            : "That didn't work. Please try again.",
        );
        return;
      }
      show((await response.json()) as StartResponse);
    } catch {
      fail("Couldn't reach Archival. Check your connection and try again.");
    }
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
