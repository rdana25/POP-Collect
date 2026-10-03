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
  // Defaults to the real deployed backend now that this is a live site, not
  // a local-only prototype — override via window.CARDLINE_API_BASE (set in
  // an inline <script> before this file loads) or
  // localStorage.setItem('cardline_api_base', 'http://localhost:8010/v1')
  // for local dev testing against a laptop-hosted backend instead.
  const API_BASE =
    window.CARDLINE_API_BASE ||
    localStorage.getItem("cardline_api_base") ||
    "https://api-demo.swop.trade/v1";

  // Where Supabase should send the browser back to after Google OAuth or an
  // email-confirmation click. Defaults to this page, minus any fragment.
  //
  // IMPORTANT: Supabase validates this server-side against the project's
  // "Redirect URLs" allow-list (Dashboard → Authentication → URL
  // Configuration). Anything not on that list is silently ignored and the
  // user is sent to the project's Site URL instead — which on this shared
  // project is the live SWOP app. So this value alone cannot fix a wrong
  // redirect; the URL must also be allow-listed there.
  const RETURN_URL =
    window.CARDLINE_RETURN_URL || window.location.href.split("#")[0];

  // Anti-scrape "fingerprint" header the backend's security_middleware
  // (backend/main.py) requires on every authenticated request — NOT a real
  // auth boundary (the Supabase JWT is), just a speed bump against raw API
  // scrapers, and its own comment in main.py says it's expected to ship in
  // the browser bundle since it can be extracted from there anyway. Without
  // it every authed call gets a 403 "Missing fingerprint" — override via
  // window.CARDLINE_APP_FINGERPRINT_SECRET the same way as the Supabase
  // keys above if this ever needs to point at a different backend.
  const APP_FINGERPRINT_SECRET =
    window.CARDLINE_APP_FINGERPRINT_SECRET ||
    "3123428fa318e80e879bccce44412db7d816de80c3ac88caf1b021c5999779b0";

  async function computeFingerprint(ts) {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw", enc.encode(APP_FINGERPRINT_SECRET),
      { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
    );
    const sig = await crypto.subtle.sign("HMAC", key, enc.encode(ts));
    return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }

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

  // Demo account: signs in locally (no Supabase user, no API calls) and
  // app.js shows its mock inventory. Not a secret — it's printed on the
  // sign-in card; it only ever unlocks the sample data.
  const DEMO_EMAIL = "demo@popcollect.com";
  const DEMO_PASSWORD = "popcollect";
  const DEMO_KEY = "popcollect.demo";
  const DEMO_SESSION = { demo: true, user: { email: DEMO_EMAIL } };

  function isDemo() {
    try { return localStorage.getItem(DEMO_KEY) === "1"; } catch (_) { return false; }
  }

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
          options: { redirectTo: RETURN_URL },
        });
        if (error) throw error;
      } catch (err) {
        setLoginError((err && err.message) || "Google sign-in failed.");
        googleBtn.disabled = false;
      }
    });

    const sub = document.getElementById("loginSub");
    const signupFields = document.getElementById("signupFields");
    const businessField = document.getElementById("signupBusinessField");
    const confirmField = document.getElementById("signupConfirmField");
    const passwordHint = document.getElementById("signupPasswordHint");
    const passwordInput = document.getElementById("loginPassword");
    const typeButtons = signupFields.querySelectorAll("[data-account-type]");
    let accountType = "individual";

    function clearInvalid() {
      form.querySelectorAll(".is-invalid").forEach((el) => el.classList.remove("is-invalid"));
    }

    function applyMode() {
      title.textContent = signupMode ? "Create your account" : "Sign in";
      sub.textContent = signupMode
        ? "Register as an individual or a business to start tracking margin on your card inventory."
        : "Sign in to your Pop Collect account to sync your Shopify inventory and eBay pricing alerts.";
      submitBtn.textContent = signupMode ? "Create account" : "Sign in";
      toggle.textContent = signupMode
        ? "Have an account? Sign in"
        : "Need an account? Sign up";
      signupFields.hidden = !signupMode;
      confirmField.hidden = !signupMode;
      passwordHint.hidden = !signupMode;
      document.getElementById("loginDemo").hidden = signupMode;
      passwordInput.autocomplete = signupMode ? "new-password" : "current-password";
      clearInvalid();
      setLoginError("");
    }

    typeButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        accountType = btn.dataset.accountType;
        typeButtons.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
        businessField.hidden = accountType !== "business";
      });
    });

    toggle.addEventListener("click", () => {
      signupMode = !signupMode;
      applyMode();
    });

    function enterDemo() {
      try { localStorage.setItem(DEMO_KEY, "1"); } catch (_) {}
      currentSession = DEMO_SESSION;
      showOverlay(false);
      resolve(currentSession);
    }
    document.getElementById("loginDemoBtn").addEventListener("click", enterDemo);

    // Returns the registration details, or null after flagging the first
    // problem. Done by hand (the form is novalidate) so sign-in and sign-up
    // share one form without the hidden sign-up fields blocking submit.
    function readSignup(email, password) {
      const val = (id) => document.getElementById(id).value.trim();
      const fail = (id, msg) => {
        const el = document.getElementById(id);
        el.classList.add("is-invalid");
        el.focus();
        setLoginError(msg);
        return null;
      };
      const firstName = val("signupFirstName");
      const lastName = val("signupLastName");
      const businessName = accountType === "business" ? val("signupBusinessName") : "";
      const phone = val("signupPhone");
      if (!firstName) return fail("signupFirstName", "Enter your first name.");
      if (!lastName) return fail("signupLastName", "Enter your last name.");
      if (accountType === "business" && !businessName)
        return fail("signupBusinessName", "Enter your business name.");
      const digits = phone.replace(/\D/g, "");
      if (!/^\+?[\d\s().-]+$/.test(phone) || digits.length < 7 || digits.length > 15)
        return fail("signupPhone", "Enter a valid phone number.");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return fail("loginEmail", "Enter a valid email address.");
      if (password.length < 8)
        return fail("loginPassword", "Password must be at least 8 characters.");
      if (password !== document.getElementById("signupPasswordConfirm").value)
        return fail("signupPasswordConfirm", "Passwords don't match.");
      return {
        account_type: accountType,
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`,
        business_name: businessName || null,
        phone,
      };
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      setLoginError("");
      clearInvalid();
      const email = document.getElementById("loginEmail").value.trim();
      const password = passwordInput.value;
      let profile = null;
      if (signupMode) {
        profile = readSignup(email, password);
        if (!profile) return;
      } else if (!email || !password) {
        setLoginError("Enter your email and password.");
        return;
      } else if (email.toLowerCase() === DEMO_EMAIL && password === DEMO_PASSWORD) {
        enterDemo();
        return;
      }
      submitBtn.disabled = true;
      try {
        const { data, error } = signupMode
          ? await sb.auth.signUp({
              email,
              password,
              options: {
                // Without this, the confirmation email's link falls back to the
                // Supabase project's Site URL — which is the live SWOP app, not
                // this dashboard. Shared project, so we don't control that
                // default; we can only override it per-request.
                emailRedirectTo: RETURN_URL,
                // Registration details, stored as the user's metadata.
                data: profile,
              },
            })
          : await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;

        if (signupMode && !data.session) {
          // Email confirmation required before a session exists — bounce
          // back to sign-in rather than leaving the form in a dead state.
          signupMode = false;
          applyMode();
          passwordInput.value = "";
          document.getElementById("signupPasswordConfirm").value = "";
          setLoginError(
            "Check your email to confirm your account, then sign in.",
          );
          return;
        }

        currentSession = data.session;
        showOverlay(false);
        resolve(currentSession);
      } catch (err) {
        setLoginError(
          (err && err.message) || (signupMode ? "Sign-up failed." : "Sign-in failed."),
        );
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  async function api(path, options = {}) {
    if (!currentSession) throw new Error("Not signed in");
    const ts = Math.floor(Date.now() / 1000).toString();
    const fingerprint = await computeFingerprint(ts);
    const resp = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${currentSession.access_token}`,
        "X-App-Fingerprint": fingerprint,
        "X-App-Ts": ts,
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
      if (isDemo()) {
        currentSession = DEMO_SESSION;
        showOverlay(false);
        return Promise.resolve(currentSession);
      }
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
      if (isDemo()) {
        try { localStorage.removeItem(DEMO_KEY); } catch (_) {}
        window.location.reload();
        return;
      }
      sb.auth.signOut().finally(() => window.location.reload());
    },

    // Permanently deletes the signed-in user. The API (DELETE /account) must
    // remove the Supabase auth user with the service-role key and cascade
    // their data — the browser's anon key can't delete users itself.
    async deleteAccount() {
      if (isDemo()) {
        // Nothing server-side to delete: just forget everything this
        // browser stored for the demo and go back to sign-in.
        try {
          Object.keys(localStorage)
            .filter((k) => k.startsWith("popcollect.") || k.startsWith("cardline."))
            .forEach((k) => localStorage.removeItem(k));
        } catch (_) {}
        window.location.reload();
        return;
      }
      await api("/account", { method: "DELETE" });
      await sb.auth.signOut().catch(() => {});
      window.location.reload();
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
