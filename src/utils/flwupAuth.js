/**
 * FLWUP & Supabase Authentication & Automated Token Renewal Manager
 * 
 * Provides automated token validation, auto-refresh via Supabase refresh_token,
 * automated credential login, and persistent .env synchronization.
 * Ensures API requests never fail due to token expiration.
 */

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.FLWUP_SUPABASE_URL || 'https://nzpuhnqobsffhcqejmgv.supabase.co';
const SUPABASE_ANON_KEY = process.env.FLWUP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56cHVobnFvYnNmZmhjcWVqbWd2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2ODQ1ODEsImV4cCI6MjEwMDI2MDU4MX0.BzvzYsh8oR3itpaoO3T-dRP7FHpRxedi6QgmSsRXB8k';

/**
 * Locate the active .env file
 */
function getEnvPath() {
  const candidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(__dirname, '../../.env'),
    path.resolve(__dirname, '../../../backend/.env')
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
}

/**
 * Parse JWT payload without external libraries
 */
function parseJwt(token) {
  if (!token || typeof token !== 'string') return null;
  const clean = token.trim().replace(/^Bearer\s+/i, '');
  const parts = clean.split('.');
  if (parts.length < 2) return null;
  try {
    const json = Buffer.from(parts[1], 'base64').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Inspect a token's validity and remaining lifetime
 */
function getTokenInfo(token) {
  const payload = parseJwt(token);
  if (!payload || !payload.exp) {
    return {
      valid: false,
      expired: true,
      expiringSoon: true,
      secondsRemaining: 0,
      expiresAt: null,
      email: null
    };
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const secondsRemaining = payload.exp - nowSec;
  const expiresAt = new Date(payload.exp * 1000);
  const expired = secondsRemaining <= 0;
  const expiringSoon = secondsRemaining <= 300; // <= 5 minutes

  return {
    valid: !expired,
    expired,
    expiringSoon,
    secondsRemaining,
    expiresAt,
    email: payload.email || payload.user_metadata?.email || null,
    payload
  };
}

/**
 * Refresh Supabase session using a refresh_token
 */
async function refreshSession(refreshToken) {
  if (!refreshToken) throw new Error('No refresh_token provided');

  const cleanToken = refreshToken.trim();
  const url = `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ refresh_token: cleanToken })
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errMsg = data.error_description || data.msg || data.message || `HTTP ${res.status}`;
    throw new Error(`Refresh token renewal failed: ${errMsg}`);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    user: data.user
  };
}

/**
 * Authenticate using FLWUP login credentials (email & password)
 */
async function loginWithPassword(email, password) {
  if (!email || !password) throw new Error('Email and password are required');

  const url = `${SUPABASE_URL}/auth/v1/token?grant_type=password`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: email.trim(),
      password: password.trim()
    })
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errMsg = data.error_description || data.msg || data.message || `HTTP ${res.status}`;
    throw new Error(`Credential login failed: ${errMsg}`);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    user: data.user
  };
}

/**
 * Persist updated tokens into .env and process.env
 */
function saveTokensToEnv({ accessToken, refreshToken }, targetEnvPath = getEnvPath()) {
  if (accessToken) process.env.FLWUP_TOKEN = accessToken;
  if (refreshToken) process.env.FLWUP_REFRESH_TOKEN = refreshToken;

  if (!fs.existsSync(targetEnvPath)) {
    fs.writeFileSync(
      targetEnvPath,
      `FLWUP_TOKEN=${accessToken || ''}\nFLWUP_REFRESH_TOKEN=${refreshToken || ''}\n`,
      'utf8'
    );
    return;
  }

  let content = fs.readFileSync(targetEnvPath, 'utf8');

  // Update or insert FLWUP_TOKEN
  if (accessToken) {
    if (/^FLWUP_TOKEN=.*$/m.test(content)) {
      content = content.replace(/^FLWUP_TOKEN=.*$/m, `FLWUP_TOKEN=${accessToken}`);
    } else {
      content += `\nFLWUP_TOKEN=${accessToken}\n`;
    }
  }

  // Update or insert FLWUP_REFRESH_TOKEN
  if (refreshToken) {
    if (/^FLWUP_REFRESH_TOKEN=.*$/m.test(content)) {
      content = content.replace(/^FLWUP_REFRESH_TOKEN=.*$/m, `FLWUP_REFRESH_TOKEN=${refreshToken}`);
    } else {
      content += `\nFLWUP_REFRESH_TOKEN=${refreshToken}\n`;
    }
  }

  fs.writeFileSync(targetEnvPath, content, 'utf8');
}

/**
 * Ensure the active token is valid, auto-renewing if expired or expiring soon
 * 
 * @param {Object} options
 * @param {boolean} [options.force=false] Force token renewal regardless of expiration
 * @param {number} [options.minBufferSeconds=300] Minimum remaining lifetime before refreshing
 * @param {string} [options.envPath] Path to .env file
 * @returns {Promise<{ token: string, renewed: boolean, method?: string, info: Object }>}
 */
async function ensureValidToken(options = {}) {
  const { force = false, minBufferSeconds = 300, envPath = getEnvPath() } = options;

  let currentToken = process.env.FLWUP_TOKEN || '';
  const info = getTokenInfo(currentToken);

  // If already valid and not expiring soon and not forced, return as-is
  if (!force && info.valid && info.secondsRemaining > minBufferSeconds) {
    return {
      token: currentToken,
      renewed: false,
      info
    };
  }

  if (force) {
    console.log('🔄 Token renewal requested (forced/401 retry)...');
  } else if (info.expired) {
    console.log(`⚠️  FLWUP token expired at ${info.expiresAt ? info.expiresAt.toISOString() : 'unknown'}. Attempting auto-renewal...`);
  } else {
    console.log(`⏳ FLWUP token expiring in ${Math.round(info.secondsRemaining / 60)} minutes. Refreshing proactively...`);
  }

  const refreshToken = process.env.FLWUP_REFRESH_TOKEN;
  const email = process.env.FLWUP_EMAIL;
  const password = process.env.FLWUP_PASSWORD;

  // 1. Try Refresh Token
  if (refreshToken) {
    try {
      console.log('🔑 Attempting session refresh using FLWUP_REFRESH_TOKEN...');
      const renewed = await refreshSession(refreshToken);
      saveTokensToEnv(renewed, envPath);
      console.log('✅ Token successfully renewed via refresh token! (.env updated)');
      return {
        token: renewed.accessToken,
        renewed: true,
        method: 'refresh_token',
        info: getTokenInfo(renewed.accessToken)
      };
    } catch (err) {
      console.warn(`⚠️  Refresh token attempt failed: ${err.message}`);
    }
  }

  // 2. Try Email + Password credentials
  if (email && password) {
    try {
      console.log(`🔐 Attempting automatic login for ${email}...`);
      const auth = await loginWithPassword(email, password);
      saveTokensToEnv(auth, envPath);
      console.log(`✅ Authentication successful for ${email}! (.env updated with new token & refresh token)`);
      return {
        token: auth.accessToken,
        renewed: true,
        method: 'credentials',
        info: getTokenInfo(auth.accessToken)
      };
    } catch (err) {
      console.warn(`⚠️  Credential login attempt failed: ${err.message}`);
    }
  }

  // 3. Neither succeeded
  const guidance = [
    '❌ Automatic token renewal could not proceed because neither valid credentials nor a refresh token are configured in .env.',
    '',
    '👉 TO MAKE THE TOKEN NEVER EXPIRE, choose either option in backend/.env:',
    '',
    '  Option A (Recommended — 100% automated, never expires):',
    '    FLWUP_EMAIL=your_email@booranmotors.com.au',
    '    FLWUP_PASSWORD=your_flwup_password',
    '    (The system will automatically log in and refresh indefinitely!)',
    '',
    '  Option B (Using browser refresh token):',
    '    In Chrome DevTools -> Application -> Local Storage -> https://flwup.com.au:',
    '    Copy "refresh_token" from "sb-nzpuhnqobsffhcqejmgv-auth-token" and set:',
    '    FLWUP_REFRESH_TOKEN=your_refresh_token',
    '    (The system will auto-rotate and refresh indefinitely!)',
    ''
  ].join('\n');

  console.error(guidance);

  return {
    token: currentToken,
    renewed: false,
    error: 'Renewal failed: credentials or refresh token required',
    guidance,
    info
  };
}

// CLI utility when run directly
if (require.main === module) {
  // Load .env first
  const dotenv = require('dotenv');
  dotenv.config({ path: getEnvPath() });

  const arg = process.argv[2];

  (async () => {
    const current = process.env.FLWUP_TOKEN;
    const info = getTokenInfo(current);

    console.log('───────────────────────────────────────────────────────');
    console.log('🛡️  FLWUP Authentication & Token Status');
    console.log('───────────────────────────────────────────────────────');
    console.log(`Env File:          ${getEnvPath()}`);
    console.log(`User:              ${info.email || 'None'}`);
    console.log(`Token Present:     ${Boolean(current)}`);
    console.log(`Token Valid:       ${info.valid}`);
    console.log(`Expires At:        ${info.expiresAt ? info.expiresAt.toLocaleString() : 'N/A'}`);
    console.log(`Time Remaining:    ${info.secondsRemaining > 0 ? `${Math.round(info.secondsRemaining / 60)} minutes` : 'EXPIRED'}`);
    console.log(`Refresh Token Set: ${Boolean(process.env.FLWUP_REFRESH_TOKEN)}`);
    console.log(`Credentials Set:   ${Boolean(process.env.FLWUP_EMAIL && process.env.FLWUP_PASSWORD)}`);
    console.log('───────────────────────────────────────────────────────\n');

    if (arg === '--renew' || arg === '-r' || info.expired) {
      const res = await ensureValidToken({ force: true });
      if (res.renewed) {
        console.log(`🎉 Token refreshed! New expiration: ${res.info.expiresAt.toLocaleString()}`);
      }
    }
  })().catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
}

module.exports = {
  parseJwt,
  getTokenInfo,
  refreshSession,
  loginWithPassword,
  saveTokensToEnv,
  ensureValidToken,
  getEnvPath,
  SUPABASE_URL,
  SUPABASE_ANON_KEY
};
