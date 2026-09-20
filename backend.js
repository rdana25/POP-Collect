/* =========================================================================
   Cardline — backend wiring (real Supabase auth + the Cardline/SWOP API)

   Kept separate from app.js so the demo/prototype rendering code stays
   untouched except at a few real-data seams: CARDS gets populated from
   the API instead of literals, and the Shopify connection card in the
   Sync tab reflects real connect/disconnect state. Everything else
   (billing, plan slider, Slack/Discord destinations, sync log, activity
   feed) is still mock — those weren't part of this pass.

   Load order matters: this file must load AFTER the Supabase JS CDN
   script and BEFORE app.js. app.js calls CardlineBackend.init() and
   waits for it to resolve (i.e. the user is signed in) before running
   its own init() — so nothing in the app renders behind an
   unauthenticated screen.
   ========================================================================= */

(function () {
  // Same Supabase project the backend's SUPABASE_JWT_SECRET validates
  // tokens against (platform-prototype/frontend/src/integrations/supabase/client.ts)
  // — sign in here and the resulting JWT is valid on every /v1 endpoint.
  // This is the public anon key; it is meant to ship client-side, so it's
  // fine hardcoded here — there's no build step / bundler in this repo to
  // inject it from a .env file, and `process.env` doesn't exist in a
  // browser at all (that's a Node-only API). To point at a different
  // Supabase project without editing this file, set these two globals in
  // an inline <script> in index.html BEFORE this file loads:
  //   <script>window.CARDLINE_SUPABASE_URL = '...'; window.CARDLINE_SUPABASE_ANON_KEY = '...';</script>
  const SUPABASE_URL = window.CARDLINE_SUPABASE_URL || "https://apeuyuaqepblgtniwlea.supabase.co";
  const SUPABASE_ANON_KEY = window.CARDLINE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwZXV5dWFxZXBibGd0bml3bGVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE3OTU2NzUsImV4cCI6MjA2NzM3MTY3NX0.lhVXLBW0bnjRhnUdPcrjqzb6EqKrt9UVKk_3zc_oAVM";
  const API_BASE =
    window.CARDLINE_API_BASE ||
    localStorage.getItem("cardline_api_base") ||
    "http://localhost:8010/v1";

  // If the Supabase CDN script didn't load (network issue, ad blocker,
  // offline), `window.supabase` is undefined here. Bail out cleanly rather
  // than throwing an uncaught error into the console — app.js's startApp()
  // checks for `window.CardlineBackend` being undefined and falls back to
  // static demo data in exactly this case.
  if (!window.supabase) {
    console.warn("Cardline: Supabase JS failed to load — real backend features are unavailable.");
    return;
  }

  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true },
  });

  let currentSession = null;
  let signupMode = false;

  function showOverlay(show) {
    document.getElementById("loginOverlay").hidden = !show;
    document.getElementById("appRoot").hidden = show;
  }

  function setLoginError(msg) {
    const el = document.getElementById("loginError");
    el.textContent = msg || "";
    el.hidden = !msg;
  }

  function wireLoginForm(resolve) {
    const form = document.getElementById("loginForm");
    const toggle = document.getElementById("loginToggleMode");
    const title = document.getElementById("loginTitle");
    const submitBtn = document.getElementById("loginSubmitBtn");
    const googleBtn = document.getElementById("loginGoogleBtn");

    // Accounts created via "Continue with Google" on the real SWOP app have
    // no password at all — email/password sign-in always fails for them
    // with "Invalid login credentials" regardless of what's typed. This is
    // the other half of that login path.
    googleBtn.addEventListener("click", async () => {
      setLoginError("");
      googleBtn.disabled = true;
      try {
        // Full-page redirect to Google, then back to this exact URL with
        // the session in the URL fragment — supabase-js picks it up
        // automatically on the next CardlineBackend.init() (getSession()
        // parses it because detectSessionInUrl defaults to true), so no
        // extra handling is needed here beyond starting the redirect.
        const { error } = await sb.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: window.location.href.split("#")[0] },
        });
        if (error) throw error;
      } catch (err) {
        setLoginError((err && err.message) || "Google sign-in failed.");
        googleBtn.disabled = false;
      }
    });

    toggle.addEventListener("click", () => {
      signupMode = !signupMode;
      title.textContent = signupMode ? "Create account" : "Sign in";
      submitBtn.textContent = signupMode ? "Sign up" : "Sign in";
      toggle.textContent = signupMode
        ? "Have an account? Sign in"
        : "Need an account? Sign up";
      setLoginError("");
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      setLoginError("");
      submitBtn.disabled = true;
      const email = document.getElementById("loginEmail").value.trim();
      const password = document.getElementById("loginPassword").value;
      try {
        const { data, error } = signupMode
          ? await sb.auth.signUp({ email, password })
          : await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;

        if (signupMode && !data.session) {
          // Email confirmation required before a session exists — bounce
          // back to sign-in rather than leaving the form in a dead state.
          setLoginError(
            "Check your email to confirm your account, then sign in.",
          );
          signupMode = false;
          title.textContent = "Sign in";
          submitBtn.textContent = "Sign in";
          toggle.textContent = "Need an account? Sign up";
          return;
        }

        currentSession = data.session;
        showOverlay(false);
        resolve(currentSession);
      } catch (err) {
        setLoginError((err && err.message) || "Sign-in failed.");
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  async function api(path, options = {}) {
    if (!currentSession) throw new Error("Not signed in");
    const resp = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${currentSession.access_token}`,
        ...(options.headers || {}),
      },
    });
    let body = null;
    try {
      body = await resp.json();
    } catch (_e) {
      /* no/invalid JSON body */
    }
    if (!resp.ok) {
      const detail = body && body.detail;
      throw new Error(
        typeof detail === "string"
          ? detail
          : resp.statusText || `HTTP ${resp.status}`,
      );
    }
    return body;
  }

  window.CardlineBackend = {
    // Resolves once a session exists — shows the login overlay and waits
    // for a real sign-in if there isn't one already.
    init() {
      return sb.auth.getSession().then(({ data }) => {
        if (data && data.session) {
          currentSession = data.session;
          showOverlay(false);
          return currentSession;
        }
        showOverlay(true);
        return new Promise((resolve) => wireLoginForm(resolve));
      });
    },

    getSession() {
      return currentSession;
    },

    signOut() {
      sb.auth.signOut().finally(() => window.location.reload());
    },

    fetchInventory() {
      return api("/card-watch/inventory");
    },
    fetchAlerts() {
      return api("/card-watch/alerts");
    },
    // Runs the sold-comp check immediately instead of waiting for the daily
    // cron (deploy/card_watch_refresh.sh) — auto-enables card_watch_settings
    // with defaults on first call, so there's no separate settings step.
    runCardWatchSyncNow() {
      return api("/card-watch/sync-now", { method: "POST" });
    },
    fetchShopifyStatus() {
      return api("/shopify/status");
    },

    connectShopifyToken(storeUrl, accessToken) {
      return api("/shopify/connect", {
        method: "POST",
        body: JSON.stringify({
          store_url: storeUrl,
          access_token: accessToken,
        }),
      });
    },

    disconnectShopify() {
      return api("/shopify/disconnect", { method: "POST" });
    },

    async startShopifyOAuth(shop) {
      const res = await api(
        `/shopify/oauth/install?shop=${encodeURIComponent(shop)}`,
      );
      window.location.href = res.authorize_url;
    },

    syncShopifyListings() {
      return api("/shopify/sync-listings", { method: "POST" });
    },
  };
})();
