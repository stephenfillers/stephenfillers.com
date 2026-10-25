// Contact form endpoint. Every other request goes straight to the static
// assets (see run_worker_first in wrangler.jsonc), so this only sees /api/*.
//
// Secrets (set with `wrangler secret put`, or .dev.vars locally):
//   RESEND_API_KEY    sending key for mail.stephenfillers.com
//   TURNSTILE_SECRET  secret key for the Turnstile widget on the form
//   CONTACT_TO        inbox the messages are delivered to
// TURNSTILE_HOSTNAMES (a plain var) lists the hostnames tokens may come from.

const LIMITS = { name: 100, email: 254, message: 5000 };
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const json = function (body, status = 200) {
  return Response.json(body, { status });
};

// The widget's data-action; siteverify must echo it back unchanged
const TURNSTILE_ACTION = "contact";

const verifyTurnstile = async function (token, ip, env) {
  const expectedHostnames = new Set(
    (env.TURNSTILE_HOSTNAMES ?? "")
      .split(",")
      .map((hostname) => hostname.trim())
      .filter(Boolean)
  );

  if (
    typeof token !== "string" ||
    token.length === 0 ||
    token.length > 2048 ||
    expectedHostnames.size === 0
  ) {
    return false;
  }

  let outcome;
  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        signal: AbortSignal.timeout(10_000),
        body: new URLSearchParams({
          secret: env.TURNSTILE_SECRET,
          response: token,
          ...(ip && { remoteip: ip }),
        }),
      }
    );
    if (!res.ok) throw new Error(`siteverify ${res.status}`);
    outcome = await res.json();
  } catch {
    return false;
  }

  return (
    outcome.success === true &&
    outcome.action === TURNSTILE_ACTION &&
    expectedHostnames.has(outcome.hostname)
  );
};

const handleContact = async function (request, env) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "POST" },
    });
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, error: "Couldn’t read the form." }, 400);
  }

  // Honeypot: real visitors never see this field, so pretend it worked
  if (form.get("website")) return json({ ok: true });

  // Collapse whitespace in single-line fields so they're safe in a subject
  const name = String(form.get("name") ?? "").replace(/\s+/g, " ").trim();
  const email = String(form.get("email") ?? "").trim();
  const message = String(form.get("message") ?? "").trim();
  const token = String(form.get("cf-turnstile-response") ?? "");

  if (!name || !email || !message) {
    return json({ ok: false, error: "Please fill in every field." }, 400);
  }
  if (
    name.length > LIMITS.name ||
    email.length > LIMITS.email ||
    message.length > LIMITS.message
  ) {
    return json({ ok: false, error: "That message is too long." }, 400);
  }
  if (!EMAIL_PATTERN.test(email)) {
    return json({ ok: false, error: "That email address looks off." }, 400);
  }

  const ip = request.headers.get("CF-Connecting-IP");
  if (!(await verifyTurnstile(token, ip, env))) {
    return json(
      { ok: false, error: "Couldn’t verify you’re human. Please try again." },
      403
    );
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.CONTACT_FROM,
      to: [env.CONTACT_TO],
      reply_to: email,
      subject: `New message from ${name}`,
      text: `${message}\n\n—\n${name} <${email}>\nSent from the contact form on stephenfillers.com`,
    }),
  });

  if (!res.ok) {
    console.error("Resend error", res.status, await res.text());
    return json(
      { ok: false, error: "Something went wrong sending that. Please try again." },
      502
    );
  }

  return json({ ok: true });
};

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/contact") return handleContact(request, env);
    if (pathname.startsWith("/api/")) return new Response("Not found", { status: 404 });
    return env.ASSETS.fetch(request);
  },
};
