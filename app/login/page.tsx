"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type LoginUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  practiceId: string;
};

type ChallengeState = {
  challengeName: string;
  session: string;
  username: string;
};

async function postJson(path: string, body: Record<string, unknown>) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Request failed.");
  return data;
}

export default function LoginPage() {
  const [returnTo, setReturnTo] = useState("/ehr");
  const [user, setUser] = useState<LoginUser | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [recoveryMode, setRecoveryMode] = useState<"" | "request" | "confirm">("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [challenge, setChallenge] = useState<ChallengeState | null>(null);
  const [mfaSetupSession, setMfaSetupSession] = useState("");
  const [mfaSecret, setMfaSecret] = useState("");
  const [mfaQrCodeUrl, setMfaQrCodeUrl] = useState("");
  const [replaceMfa, setReplaceMfa] = useState(false);
  const [apiResult, setApiResult] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const otpauthUrl = useMemo(() => {
    if (!mfaSecret || !email) return "";
    return `otpauth://totp/RLTH%20EHR:${encodeURIComponent(email)}?secret=${encodeURIComponent(mfaSecret)}&issuer=RLTH%20EHR`;
  }, [email, mfaSecret]);

  useEffect(() => {
    const candidate = new URLSearchParams(window.location.search).get("returnTo") || "";
    if (candidate === "/ehr" || candidate.startsWith("/ehr/")) setReturnTo(candidate);
  }, []);

  useEffect(() => {
    let active = true;
    setMfaQrCodeUrl("");

    if (!otpauthUrl) {
      return () => {
        active = false;
      };
    }

    async function buildQrCode() {
      try {
        const qrCodeModule = await import("qrcode");
        const toDataURL = qrCodeModule.toDataURL || qrCodeModule.default?.toDataURL;
        if (!toDataURL) throw new Error("QR code generator unavailable.");
        const dataUrl = await toDataURL(otpauthUrl, {
          errorCorrectionLevel: "M",
          margin: 2,
          width: 220,
          color: {
            dark: "#2b2926",
            light: "#ffffff",
          },
        });
        if (active) setMfaQrCodeUrl(dataUrl);
      } catch {
        if (active) setMfaQrCodeUrl("");
      }
    }

    buildQrCode();

    return () => {
      active = false;
    };
  }, [otpauthUrl]);

  useEffect(() => {
    let active = true;
    fetch("/api/ehr/auth/session", { credentials: "include" })
      .then((response) => response.json())
      .then((data) => {
        if (active && data.authenticated) setUser(data.user);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  function applyAuthResponse(data: any) {
    if (data.authenticated) {
      setUser(data.user);
      setChallenge(null);
      setMfaSecret("");
      setMfaSetupSession("");
      setMfaQrCodeUrl("");
      setPassword("");
      setNewPassword("");
      setMfaCode("");
      return;
    }

    setChallenge({
      challengeName: data.challengeName,
      session: data.session,
      username: data.username || email,
    });
  }

  async function handleLogin() {
    setBusy(true);
    setError("");
    setApiResult("");
    try {
      const data = await postJson("/api/ehr/auth/login", { email, password });
      applyAuthResponse(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Login failed.");
    } finally {
      setBusy(false);
    }
  }

  async function requestPasswordReset() {
    setBusy(true);
    setError("");
    try {
      await postJson("/api/ehr/auth/password/forgot", { email });
      setRecoveryMode("confirm");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Password recovery could not be started.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmPasswordReset() {
    setBusy(true);
    setError("");
    try {
      await postJson("/api/ehr/auth/password/confirm", { email, confirmationCode: recoveryCode, newPassword });
      setRecoveryMode("");
      setRecoveryCode("");
      setNewPassword("");
      setApiResult("Password updated. Sign in with the new password.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Password reset failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleNewPassword() {
    if (!challenge) return;
    setBusy(true);
    setError("");
    try {
      const data = await postJson("/api/ehr/auth/respond", {
        challengeName: "NEW_PASSWORD_REQUIRED",
        session: challenge.session,
        username: challenge.username,
        newPassword,
      });
      applyAuthResponse(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Password change failed.");
    } finally {
      setBusy(false);
    }
  }

  async function startMfaSetup() {
    if (!challenge) return;
    setBusy(true);
    setError("");
    try {
      const data = await postJson("/api/ehr/auth/mfa/setup", { session: challenge.session });
      setMfaSecret(data.secretCode || "");
      setMfaSetupSession(data.session || "");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "MFA setup failed.");
    } finally {
      setBusy(false);
    }
  }

  async function finishMfaSetup() {
    if (!challenge) return;
    setBusy(true);
    setError("");
    try {
      const verify = await postJson("/api/ehr/auth/mfa/verify", {
        session: mfaSetupSession,
        userCode: mfaCode,
      });
      const data = await postJson("/api/ehr/auth/respond", {
        challengeName: "MFA_SETUP",
        session: verify.session,
        username: challenge.username,
      });
      applyAuthResponse(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "MFA verification failed.");
    } finally {
      setBusy(false);
    }
  }

  async function startAuthenticatedMfaReplacement() {
    setBusy(true);
    setError("");
    try {
      const data = await postJson("/api/ehr/auth/mfa/setup", {});
      setMfaSecret(data.secretCode || "");
      setReplaceMfa(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Authenticator replacement could not be started.");
    } finally {
      setBusy(false);
    }
  }

  async function finishAuthenticatedMfaReplacement() {
    setBusy(true);
    setError("");
    try {
      await postJson("/api/ehr/auth/mfa/verify", { userCode: mfaCode });
      setReplaceMfa(false);
      setMfaSecret("");
      setMfaCode("");
      setApiResult("New RLTH EHR authenticator verified. MFA replacement is complete.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Authenticator verification failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSoftwareMfa() {
    if (!challenge) return;
    setBusy(true);
    setError("");
    try {
      const data = await postJson("/api/ehr/auth/respond", {
        challengeName: "SOFTWARE_TOKEN_MFA",
        session: challenge.session,
        username: challenge.username,
        mfaCode,
      });
      applyAuthResponse(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Authenticator code failed.");
    } finally {
      setBusy(false);
    }
  }

  async function checkAuditApi() {
    setBusy(true);
    setError("");
    setApiResult("");
    try {
      const response = await fetch("/api/ehr/audit?limit=5", { credentials: "include" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Audit API check failed.");
      setApiResult(JSON.stringify({ auditEventsReturned: data.events?.length ?? 0, status: "Audit API connected" }, null, 2));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Audit API check failed.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    setError("");
    try {
      await fetch("/api/ehr/auth/logout", { method: "POST", credentials: "include" });
      setUser(null);
      setApiResult("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="rlth-login">
      <style jsx global>{`
        .rlth-login, .rlth-login * { box-sizing: border-box; }
        .rlth-login { min-height: 100vh; margin: 0; padding: 1.5rem; display: flex; align-items: center; justify-content: center; background: #f7f3ea; color: #2b2926; font-family: Montserrat, Arial, sans-serif; line-height: 1.45; }
        .rlth-login-card { width: min(100%, 42rem); padding: 1.5rem; border: 1px solid #ddd3c1; border-radius: 8px; background: #fff; box-shadow: 0 1px 2px rgba(43, 41, 38, 0.08); }
        .rlth-login-eyebrow { margin: 0; color: #796f63; font-size: .82rem; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; }
        .rlth-login h1 { margin: .5rem 0 0; color: #2b2926; font-size: 1.35rem; line-height: 1.2; letter-spacing: 0; text-transform: none; }
        .rlth-login p { margin: .65rem 0 0; color: #675f54; font-size: .95rem; }
        .rlth-login label { display: block; margin-top: .9rem; color: #514a41; font-size: .78rem; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; }
        .rlth-login input { width: 100%; min-height: 2.55rem; margin-top: .35rem; padding: .6rem .75rem; border: 1px solid #cfc4b2; border-radius: 8px; background: #fff; color: #2b2926; font: inherit; outline: none; }
        .rlth-login input:focus { border-color: #2b2926; box-shadow: 0 0 0 2px rgba(221, 211, 193, .75); }
        .rlth-login-password-toggle { display: inline-flex !important; align-items: center; gap: .5rem; margin-top: .65rem !important; color: #514a41 !important; font-size: .9rem !important; font-weight: 600 !important; text-transform: none !important; letter-spacing: 0 !important; cursor: pointer; }
        .rlth-login-password-toggle input { width: 1rem; min-height: 1rem; height: 1rem; margin: 0; padding: 0; accent-color: #2b2926; }
        .rlth-login-actions { display: flex; flex-wrap: wrap; gap: .75rem; margin-top: 1.1rem; }
        .rlth-login button, .rlth-login-link { display: inline-flex; align-items: center; justify-content: center; min-height: 2.5rem; padding: .6rem 1rem; border: 1px solid #2b2926; border-radius: 8px; background: #2b2926; color: #fff; font-size: .9rem; font-weight: 700; text-decoration: none; cursor: pointer; }
        .rlth-login button.secondary, .rlth-login-link.secondary { background: #fff; color: #2b2926; }
        .rlth-login button:disabled { cursor: wait; opacity: .65; }
        .rlth-login-alert { margin-top: 1rem; padding: .8rem; border: 1px solid #fecaca; border-radius: 8px; background: #fef2f2; color: #7f1d1d; font-size: .9rem; }
        .rlth-login-panel { margin-top: 1rem; padding: .9rem; border: 1px solid #ddd3c1; border-radius: 8px; background: #f8f7f4; color: #514a41; font-size: .9rem; }
        .rlth-login-code { display: block; margin-top: .5rem; padding: .75rem; overflow-wrap: anywhere; border: 1px solid #ddd3c1; border-radius: 8px; background: #fff; color: #2b2926; font-family: Consolas, monospace; font-size: .82rem; }
        .rlth-login-qr-wrap { width: 100%; margin-top: 1rem; padding: 1rem; display: flex; align-items: center; justify-content: center; border: 1px solid #ddd3c1; border-radius: 8px; background: #fff; }
        .rlth-login-qr-wrap img { width: 220px; height: 220px; display: block; }
        .rlth-login details { margin-top: 1rem; }
        .rlth-login summary { cursor: pointer; color: #2b2926; font-weight: 700; }
        .rlth-login-success { margin-top: 1rem; padding: .9rem; border: 1px solid #bbf7d0; border-radius: 8px; background: #f0fdf4; color: #166534; font-size: .9rem; }
      `}</style>
      <section className="rlth-login-card">
        <p className="rlth-login-eyebrow">Revealing Leads to Healing EHR</p>
        <h1>Secure EHR Login</h1>
        <p>Production login uses AWS Cognito with MFA and secure HttpOnly session cookies.</p>

        {!user && !challenge && recoveryMode === "" && (
          <>
            <label>Email</label>
            <input value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" />
            <label>Password</label>
            <input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
            <label className="rlth-login-password-toggle">
              <input
                type="checkbox"
                checked={showPassword}
                onChange={(event) => setShowPassword(event.target.checked)}
              />
              Show password
            </label>
            <div className="rlth-login-actions">
              <button type="button" disabled={busy} onClick={handleLogin}>Sign in</button>
              <button type="button" className="secondary" disabled={busy} onClick={() => setRecoveryMode("request")}>Forgot password</button>
              <Link className="rlth-login-link secondary" href="/">Website</Link>
            </div>
          </>
        )}

        {!user && !challenge && recoveryMode === "request" && (
          <div className="rlth-login-panel">
            <strong>Reset password</strong>
            <p>Enter the verified email address for the EHR account.</p>
            <label>Email</label>
            <input value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" />
            <div className="rlth-login-actions">
              <button type="button" disabled={busy || !email} onClick={requestPasswordReset}>Email recovery code</button>
              <button type="button" className="secondary" disabled={busy} onClick={() => setRecoveryMode("")}>Cancel</button>
            </div>
          </div>
        )}

        {!user && !challenge && recoveryMode === "confirm" && (
          <div className="rlth-login-panel">
            <strong>Enter recovery code</strong>
            <p>Enter the code sent by AWS Cognito and choose a new password.</p>
            <label>Recovery code</label>
            <input value={recoveryCode} onChange={(event) => setRecoveryCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" />
            <label>New password</label>
            <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" />
            <div className="rlth-login-actions">
              <button type="button" disabled={busy || !recoveryCode || !newPassword} onClick={confirmPasswordReset}>Set new password</button>
              <button type="button" className="secondary" disabled={busy} onClick={() => setRecoveryMode("request")}>Request another code</button>
            </div>
          </div>
        )}

        {!user && challenge?.challengeName === "NEW_PASSWORD_REQUIRED" && (
          <div className="rlth-login-panel">
            <strong>New password required</strong>
            <p>Enter a permanent password that meets the EHR password policy.</p>
            <label>New password</label>
            <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" />
            <div className="rlth-login-actions">
              <button type="button" disabled={busy} onClick={handleNewPassword}>Save new password</button>
            </div>
          </div>
        )}

        {!user && challenge?.challengeName === "MFA_SETUP" && (
          <div className="rlth-login-panel">
            <strong>Set up authenticator MFA</strong>
            <p>Use Microsoft Authenticator, Google Authenticator, or another TOTP app. Generate the QR code, scan it, then enter the 6-digit code from the app.</p>
            {!mfaSecret ? (
              <div className="rlth-login-actions">
                <button type="button" disabled={busy} onClick={startMfaSetup}>Generate MFA QR code</button>
              </div>
            ) : (
              <>
                <div className="rlth-login-qr-wrap">
                  {mfaQrCodeUrl ? (
                    <img src={mfaQrCodeUrl} alt="RLTH EHR authenticator setup QR code" />
                  ) : (
                    <span>Generating QR code...</span>
                  )}
                </div>
                <details>
                  <summary>Manual setup key if QR scan does not work</summary>
                  <span className="rlth-login-code">{mfaSecret}</span>
                </details>
                <label>6-digit authenticator code</label>
                <input value={mfaCode} onChange={(event) => setMfaCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" />
                <div className="rlth-login-actions">
                  <button type="button" disabled={busy} onClick={finishMfaSetup}>Verify MFA and sign in</button>
                </div>
              </>
            )}
          </div>
        )}

        {!user && challenge?.challengeName === "SOFTWARE_TOKEN_MFA" && (
          <div className="rlth-login-panel">
            <strong>Authenticator code required</strong>
            <label>6-digit authenticator code</label>
            <input value={mfaCode} onChange={(event) => setMfaCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" />
            <div className="rlth-login-actions">
              <button type="button" disabled={busy} onClick={handleSoftwareMfa}>Verify and sign in</button>
            </div>
          </div>
        )}

        {user && (
          <div className="rlth-login-success">
            <strong>Signed in</strong>
            <p>{user.fullName} | {user.email} | {user.role}</p>
            <div className="rlth-login-actions">
              <button type="button" disabled={busy} onClick={checkAuditApi}>Check audit API</button>
              <button type="button" className="secondary" disabled={busy} onClick={startAuthenticatedMfaReplacement}>Replace authenticator</button>
              <Link className="rlth-login-link secondary" href={returnTo}>Open EHR</Link>
              <button type="button" className="secondary" disabled={busy} onClick={logout}>Logout</button>
            </div>
          </div>
        )}

        {user && replaceMfa && mfaSecret && (
          <div className="rlth-login-panel">
            <strong>Replace RLTH EHR authenticator</strong>
            <p>Scan this new QR code in the authenticator profile you want to keep, then enter its current 6-digit code.</p>
            <div className="rlth-login-qr-wrap">
              {mfaQrCodeUrl ? <img src={mfaQrCodeUrl} alt="New RLTH EHR authenticator QR code" /> : <span>Generating QR code...</span>}
            </div>
            <label>6-digit authenticator code</label>
            <input value={mfaCode} onChange={(event) => setMfaCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" />
            <div className="rlth-login-actions">
              <button type="button" disabled={busy || mfaCode.length !== 6} onClick={finishAuthenticatedMfaReplacement}>Verify new authenticator</button>
            </div>
          </div>
        )}

        {apiResult && <pre className="rlth-login-code">{apiResult}</pre>}
        {error && <div className="rlth-login-alert">{error}</div>}
        <div className="rlth-login-panel">
          Secure patient portal. Sign in to access your account.
        </div>
      </section>
    </main>
  );
}
