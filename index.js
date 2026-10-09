#!/usr/bin/env node
/**
 * Pulls EVERYTHING from flwup.com.au and saves it as separate JSON files:
 *   dashboard/dashboard.json
 *   network_leads/leads_<dealership>.json   (one per dealership) + rooftops.json
 *   reports/report_<preset>.json            (one per report)     + catalog.json
 *   - dashboard          (GET /api/dashboard)
 *   - network leads      (rooftops list + leads for every dealership)
 *   - reports            (catalog + every report preset)
 *
 * Requires Node 18+ (built-in fetch). No npm packages.
 *
 * .env (same folder):
 *   FLWUP_TOKEN=your_token_here          (with or without "Bearer ")
 *   FLWUP_COOKIE=...                     (optional)
 *   DEALERSHIP_IDS=id1,id2               (optional fallback if rooftops can't be read)
 *   REPORTS_ENDPOINT=POST /api/manager/reports/run   (optional; see flwup_reports notes)
 *   REPORTS_ROOFTOP_ID=...               (optional x-rooftop-id for reports)
 *
 * Usage:
 *   node flwup_all.js
 *   node flwup_all.js --from 2026-07-10 --to 2026-10-07           (applies to leads AND reports)
 *   node flwup_all.js --report-from 2026-09-08 --report-to 2026-10-07
 *   node flwup_all.js --only dashboard,leads,reports              (pick sections)
 *   node flwup_all.js --out data --limit 10000
 *   node flwup_all.js --combined                                  (also write one big combined file)
 */

const fs = require("fs");
const path = require("path");

// ---- load .env ----
(function loadEnv() {
    const file = path.resolve(process.cwd(), ".env");
    if (!fs.existsSync(file)) return;
    for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
        if (line.trim().startsWith("#")) continue;
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)?\s*$/);
        if (!m) continue;
        let val = (m[2] || "").trim();
        if (/^(['"]).*\1$/.test(val)) val = val.slice(1, -1);
        if (process.env[m[1]] === undefined) process.env[m[1]] = val;
    }
})();

const BASE = process.env.FLWUP_BASE || "https://flwup.com.au";
const GROUP_ID = "a2ca4dd5-9b90-4d14-80a4-92c7a94365f4";

const PRESETS = [
    "contact_coverage", "settled_ratio_trend", "speed_vs_close", "persistence",
    "response_gaps", "conversation_to_appointment", "untouched_leads", "rep_scorecard",
    "network_scoreboard", "speed_to_lead", "source_roi", "model_demand",
    "sold_model_mix", "lost_reasons",
];

const CANDIDATES = [
    { method: "POST", path: "/api/manager/reports/run" },
    { method: "POST", path: "/api/manager/reports/query" },
    { method: "POST", path: "/api/manager/reports" },
    { method: "GET", path: "/api/manager/reports/run" },
    { method: "GET", path: "/api/manager/reports" },
    { method: "GET", path: "/api/manager/reports/{preset}" },
];

// ---- args ----
function parseArgs() {
    const args = process.argv.slice(2);
    const get = (name, def) => {
        const i = args.indexOf(`--${name}`);
        return i !== -1 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : def;
    };
    const iso = (d) => d.toISOString().slice(0, 10);
    const today = new Date();
    const daysAgo = (n) => { const d = new Date(today); d.setDate(d.getDate() - n); return iso(d); };

    const from = get("from", null);
    const to = get("to", null);
    const only = get("only", "dashboard,leads,reports").split(",").map((s) => s.trim());

    return {
        leadsFrom: from || daysAgo(89),
        leadsTo: to || iso(today),
        reportFrom: get("report-from", from || daysAgo(29)),
        reportTo: get("report-to", to || iso(today)),
        limit: parseInt(get("limit", "10000"), 10),
        out: get("out", "."),
        dealerships: get("dealerships", "").split(",").map((s) => s.trim()).filter(Boolean),
        only,
        combined: args.includes("--combined"),
    };
}

// ---- http ----
function buildHeaders() {
    const headers = {
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; flwup-all/1.0)",
        Referer: BASE + "/",
    };
    if (process.env.FLWUP_COOKIE) headers.Cookie = process.env.FLWUP_COOKIE;
    if (process.env.FLWUP_TOKEN) {
        const token = process.env.FLWUP_TOKEN.trim().replace(/^Bearer\s+/i, "");
        headers.Authorization = `Bearer ${token}`;
    } else if (!process.env.FLWUP_COOKIE) {
        console.error("Warning: no FLWUP_TOKEN or FLWUP_COOKIE set; requests will likely return 401.");
    }
    return headers;
}

// Node's fetch only says "fetch failed"; the real reason is in err.cause
function describeNetworkError(e) {
    const c = e && e.cause;
    const parts = [c && c.code, c && c.message, e && e.message].filter(Boolean);
    return [...new Set(parts)].join(" - ");
}

async function checkConnection(headers) {
    try {
        await fetch(BASE + "/", { method: "GET", headers });
        return true;
    } catch (e) {
        console.error(`\nCannot reach ${BASE} from this computer.`);
        console.error(`Reason: ${describeNetworkError(e)}`);
        console.error(`Node version: ${process.version} (needs 18+)`);
        console.error(
            "\nThis is a network problem, not a login/token problem. Things to check:\n" +
            "  1. Open https://flwup.com.au in your browser. Does it load?\n" +
            "  2. In Terminal run:  curl -I https://flwup.com.au   (if this fails too, it's your network)\n" +
            "  3. Turn off any VPN / proxy / ad-blocking DNS (e.g. Pi-hole, NextDNS) and try again.\n" +
            "  4. ENOTFOUND / EAI_AGAIN = DNS problem.  ECONNREFUSED / ETIMEDOUT = blocked or offline.\n" +
            "     CERT / SSL errors = a proxy or antivirus is intercepting HTTPS.\n" +
            "  5. If you must use a proxy: run with  NODE_USE_ENV_PROXY=1 HTTPS_PROXY=http://host:port node index.js  (Node 24+)\n" +
            "     or try IPv4 only:  NODE_OPTIONS=--dns-result-order=ipv4first node index.js"
        );
        return false;
    }
}

async function request(method, urlPath, { query, body, headers }) {
    const url = new URL(BASE + urlPath);
    if (query) Object.entries(query).forEach(([k, v]) => { if (v !== undefined && v !== "") url.searchParams.set(k, v); });
    const init = { method, headers };
    if (body) init.body = JSON.stringify(body);
    let res;
    try {
        res = await fetch(url, init);
    } catch (e) {
        throw new Error(`network error: ${describeNetworkError(e)}`);
    }
    const text = await res.text();
    let data = null;
    try { data = JSON.parse(text); } catch { /* not JSON */ }
    return { ok: res.ok, status: res.status, data, text };
}

const authHint = (status) => (status === 401 ? " (token expired? copy a fresh one into .env)" : "");

async function getJson(urlPath, query, headers) {
    const res = await request("GET", urlPath, { query, headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}${authHint(res.status)} for ${urlPath}`);
    return res.data ?? res.text;
}

const asList = (data) =>
    Array.isArray(data)
        ? data
        : data?.leads || data?.rooftops || data?.dealerships || data?.data || data?.items || [];

const slug = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function save(obj, filePath) {
    fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), "utf8");
    console.log(`Saved ${filePath}`);
}

// ---- sections ----
async function fetchDashboard(headers) {
    console.log("\n[dashboard]");
    return getJson("/api/dashboard", null, headers);
}

async function fetchNetworkLeads(opts, headers) {
    console.log(`\n[network leads] ${opts.leadsFrom} to ${opts.leadsTo}`);
    const groupPath = `/api/group/${GROUP_ID}`;
    const result = { range: { from: opts.leadsFrom, to: opts.leadsTo }, rooftops: null, dealerships: {} };

    let targets = opts.dealerships.map((id) => ({ id, name: "" }));
    if (!targets.length) {
        try {
            result.rooftops = await getJson(`${groupPath}/rooftops`, null, headers);
            targets = asList(result.rooftops)
                .map((r) => ({
                    id: r.id || r.dealership_id || r.rooftop_id || r.uuid,
                    name: r.name || r.dealership_name || r.title || "",
                }))
                .filter((t) => t.id);
        } catch (err) {
            console.error(`rooftops: failed - ${err.message}`);
        }
    }
    if (!targets.length && process.env.DEALERSHIP_IDS) {
        targets = process.env.DEALERSHIP_IDS.split(",").map((s) => s.trim()).filter(Boolean).map((id) => ({ id, name: "" }));
        console.log("Using DEALERSHIP_IDS from .env");
    }
    if (!targets.length) {
        result.error = "No dealerships found. Set DEALERSHIP_IDS in .env or use --dealerships id1,id2";
        console.error(result.error);
        return result;
    }

    for (const t of targets) {
        try {
            const data = await getJson(
                `${groupPath}/leads`,
                { from: opts.leadsFrom, to: opts.leadsTo, dealership_id: t.id, limit: opts.limit },
                { ...headers, "x-rooftop-id": t.id }
            );
            const items = asList(data);
            result.dealerships[t.id] = { name: t.name, count: items.length, leads: data };
            console.log(`  ${t.name || t.id}: ${items.length} leads`);
            if (items.length >= opts.limit) console.error(`  Note: hit the limit (${opts.limit}); there may be more.`);
        } catch (err) {
            console.error(`  ${t.name || t.id}: failed - ${err.message}`);
            result.dealerships[t.id] = { name: t.name, error: err.message };
        }
    }
    return result;
}

function presetsFromCatalog(catalog) {
    const found = new Set();
    const walk = (node) => {
        if (Array.isArray(node)) return node.forEach(walk);
        if (node && typeof node === "object") {
            for (const key of ["preset", "id", "key", "slug"]) {
                if (typeof node[key] === "string" && /^[a-z0-9_]+$/.test(node[key])) found.add(node[key]);
            }
            Object.values(node).forEach(walk);
        }
    };
    walk(catalog);
    return [...found];
}

async function fetchReports(opts, baseHeaders) {
    console.log(`\n[reports] ${opts.reportFrom} to ${opts.reportTo}`);
    const headers = { ...baseHeaders, Referer: BASE + "/app/network/reports" };
    if (process.env.REPORTS_ROOFTOP_ID) headers["x-rooftop-id"] = process.env.REPORTS_ROOFTOP_ID;

    const result = { range: { from: opts.reportFrom, to: opts.reportTo }, catalog: null, presets: {} };

    try {
        result.catalog = await getJson("/api/manager/reports/catalog", null, headers);
        const extra = presetsFromCatalog(result.catalog).filter((p) => !PRESETS.includes(p));
        if (extra.length) console.log(`Note: catalog also mentions: ${extra.join(", ")}`);
    } catch (err) {
        console.error(`catalog: failed - ${err.message}`);
    }

    let endpoint = null;
    if (process.env.REPORTS_ENDPOINT) {
        const [method, ...rest] = process.env.REPORTS_ENDPOINT.trim().split(/\s+/);
        endpoint = { method: method.toUpperCase(), path: rest.join(" ") };
    }

    const run = (ep, preset) => {
        const params = { preset, from: opts.reportFrom, to: opts.reportTo };
        if (ep.path.includes("{preset}")) delete params.preset;
        const p = ep.path.replace("{preset}", encodeURIComponent(preset));
        return ep.method === "GET"
            ? request("GET", p, { query: params, headers })
            : request(ep.method, p, { body: params, headers });
    };

    for (const preset of PRESETS) {
        try {
            let res;
            if (endpoint) {
                res = await run(endpoint, preset);
            } else {
                for (const cand of CANDIDATES) {
                    res = await run(cand, preset);
                    if (res.status === 401 || res.status === 403) break;
                    if (res.status !== 404 && res.status !== 405) { endpoint = cand; break; }
                }
                if (endpoint) console.log(`Using report endpoint: ${endpoint.method} ${endpoint.path}`);
            }
            if (!endpoint && !(res && (res.status === 401 || res.status === 403))) {
                result.error =
                    "Could not find the report endpoint. Set REPORTS_ENDPOINT in .env, e.g. REPORTS_ENDPOINT=POST /api/manager/reports/run";
                console.error(result.error);
                return result;
            }
            if (!res.ok) throw new Error(`HTTP ${res.status}${authHint(res.status)} ${res.text.slice(0, 200)}`);
            result.presets[preset] = res.data ?? res.text;
            console.log(`  ${preset}: ok`);
        } catch (err) {
            console.error(`  ${preset}: failed - ${err.message}`);
            result.presets[preset] = { error: err.message };
        }
    }
    return result;
}

// ---- main ----
async function main() {
    const opts = parseArgs();
    fs.mkdirSync(opts.out, { recursive: true });
    const headers = buildHeaders();

    if (!(await checkConnection(headers))) process.exit(1);

    const all = { fetched_at: new Date().toISOString() };

    if (opts.only.includes("dashboard")) {
        try { all.dashboard = await fetchDashboard(headers); }
        catch (err) { console.error(`dashboard: failed - ${err.message}`); all.dashboard = { error: err.message }; }
    }
    if (opts.only.includes("leads")) all.network_leads = await fetchNetworkLeads(opts, headers);
    if (opts.only.includes("reports")) all.reports = await fetchReports(opts, headers);

    // ---- write separate files ----
    console.log("");
    const failed = [];
    const write = (obj, dir, name) => {
        if (obj && obj.error && Object.keys(obj).length === 1) {   // don't overwrite good data with an error
            failed.push(name);
            return;
        }
        const folder = path.join(opts.out, dir);
        fs.mkdirSync(folder, { recursive: true });
        save(obj, path.join(folder, `${name}.json`));
    };

    // dashboard
    if (all.dashboard !== undefined) write(all.dashboard, "dashboard", "dashboard");

    // network leads: one file per dealership
    if (all.network_leads) {
        const nl = all.network_leads;
        if (nl.rooftops) write(nl.rooftops, "network_leads", "rooftops");
        for (const [id, d] of Object.entries(nl.dealerships)) {
            const name = slug(d.name) ? `${slug(d.name)}_${id.slice(0, 8)}` : id;
            write({ dealership_id: id, name: d.name, range: nl.range, count: d.count, leads: d.leads, error: d.error }, "network_leads", `leads_${name}`);
        }
    }

    // reports: catalog + one file per preset
    if (all.reports) {
        const r = all.reports;
        if (r.catalog) write(r.catalog, "reports", "catalog");
        for (const [preset, data] of Object.entries(r.presets)) {
            write(data, "reports", `report_${preset}`);
        }
    }

    // optional single combined file
    if (opts.combined) {
        const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
        save(all, path.join(opts.out, `flwup_all_${stamp}.json`));
    }

    if (failed.length) console.error(`\nNot saved (failed): ${failed.join(", ")}`);
}

main();