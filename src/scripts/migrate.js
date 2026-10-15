const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const connectDB = require('../config/db');
const Lead = require('../models/Lead');
const Rooftop = require('../models/Rooftop');
const Report = require('../models/Report');
const Catalog = require('../models/Catalog');
const Organization = require('../models/Organization');
const Dashboard = require('../models/Dashboard');

/**
 * Bulk upsert a collection using bulkWrite with updateOne + upsert:true
 * Matches records by the given keyField (e.g. 'deal_id' for leads, 'id' for rooftops)
 * - If a record with that key exists → update it with the latest data
 * - If it doesn't exist → insert it as a new document
 * Preserves CRM-managed fields (ai_status, diary_entries, etc.) by merging with $set
 */
async function bulkUpsert(Model, records, keyField, label) {
  if (!records || records.length === 0) {
    console.log(`   ⚠️  No ${label} to sync.`);
    return { inserted: 0, updated: 0, total: 0 };
  }

  const batchSize = 500;
  let inserted = 0;
  let updated = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const ops = batch.map(record => {
      const filter = { [keyField]: record[keyField] };

      // CRM-managed fields must NOT appear in $set — they are only written
      // on first insert ($setOnInsert) so syncing from FLWUP never overwrites
      // changes made by staff in the CRM (e.g. ai_status toggled off, diary notes).
      const CRM_FIELDS = ['ai_status', 'diary_entries', 'ai_queued_messages'];
      const setDoc = { ...record };
      const setOnInsertDoc = {};
      for (const f of CRM_FIELDS) {
        if (f in setDoc) {
          setOnInsertDoc[f] = setDoc[f];
          delete setDoc[f];
        }
      }
      // Ensure defaults are always present on first insert
      if (!('ai_status' in setOnInsertDoc))         setOnInsertDoc.ai_status = 'active';
      if (!('diary_entries' in setOnInsertDoc))      setOnInsertDoc.diary_entries = [];
      if (!('ai_queued_messages' in setOnInsertDoc)) setOnInsertDoc.ai_queued_messages = [];

      return {
        updateOne: {
          filter,
          update: {
            $set: setDoc,
            $setOnInsert: setOnInsertDoc
          },
          upsert: true
        }
      };
    });

    const result = await Model.bulkWrite(ops, { ordered: false });
    inserted += result.upsertedCount || 0;
    updated += result.modifiedCount || 0;
  }

  const total = await Model.countDocuments();
  console.log(
    `   ✅ ${label}: ${inserted} new | ${updated} updated | ${total} total in DB`
  );
  return { inserted, updated, total };
}

async function runMigration() {
  console.log('====================================================');
  console.log('🚀 Starting Smart Sync: FLWUP JSON → MongoDB');
  console.log('   (Upsert mode: existing records updated, new ones inserted)');
  console.log('====================================================\n');

  await connectDB();

  // ── Resolve data directories ──
  const backendDir = path.resolve(__dirname, '../..');
  const backendDataDir = fs.existsSync(path.join(backendDir, 'network_leads'))
    ? backendDir
    : path.resolve(backendDir, 'data');

  // Prefer the compiled dataset.json if it exists (produced by build-data.js)
  const datasetCandidates = [
    path.resolve(backendDir, '..', 'frontend', 'src', 'data', 'dataset.json'),
    path.resolve(backendDir, '..', 'flwup-frontend', 'src', 'data', 'dataset.json'),
    path.resolve(backendDir, 'data', 'dataset.json')
  ];
  let dataset = null;
  for (const p of datasetCandidates) {
    if (fs.existsSync(p)) {
      console.log(`📂 Using compiled dataset: ${p}`);
      dataset = JSON.parse(fs.readFileSync(p, 'utf8'));
      break;
    }
  }
  if (!dataset) {
    console.log('📂 No dataset.json found — reading raw JSON files from backend/network_leads & reports/');
  }

  const results = {};

  // ── 1. Leads ──
  console.log('\n[1/6] Syncing Leads...');
  let leadsToSync = [];

  if (dataset && Array.isArray(dataset.leads)) {
    leadsToSync = dataset.leads;
  } else {
    const leadsDir = path.join(backendDataDir, 'network_leads');
    if (fs.existsSync(leadsDir)) {
      const files = fs.readdirSync(leadsDir).filter(f => f.startsWith('leads_') && f.endsWith('.json'));
      files.forEach(f => {
        const raw = JSON.parse(fs.readFileSync(path.join(leadsDir, f), 'utf8'));
        const list = raw.leads?.data || (Array.isArray(raw.leads) ? raw.leads : []);
        list.forEach(l => {
          leadsToSync.push({
            ...l,
            dealership_name: l.dealership_name || raw.name,
            pentana_id: l.pentana_id || ('PENTANA-' + Math.floor(Math.random() * 10000000)),
            store_code: l.store_code || (Math.random() > 0.5 ? 'Store 70' : 'Store 40'),
            ai_status: l.ai_status || 'active',
            diary_entries: l.diary_entries || [{ date: new Date().toISOString(), user: 'System', note: 'Synced from FLWUP' }]
          });
        });
      });
    }
  }

  results.leads = await bulkUpsert(Lead, leadsToSync, 'deal_id', 'Leads');

  // ── 2. Rooftops ──
  console.log('\n[2/6] Syncing Rooftops...');
  let rooftopsToSync = [];
  if (dataset && Array.isArray(dataset.rooftops)) {
    rooftopsToSync = dataset.rooftops;
  } else {
    const rooftopsPath = path.join(backendDataDir, 'network_leads', 'rooftops.json');
    if (fs.existsSync(rooftopsPath)) {
      const raw = JSON.parse(fs.readFileSync(rooftopsPath, 'utf8'));
      rooftopsToSync = raw.rooftops || [];
    }
  }
  results.rooftops = await bulkUpsert(Rooftop, rooftopsToSync, 'id', 'Rooftops');

  // ── 3. Reports ──
  console.log('\n[3/6] Syncing Reports...');
  const reportsMap = { ...(dataset?.reports || {}) };
  if (Object.keys(reportsMap).length === 0) {
    const reportsDir = path.join(backendDataDir, 'reports');
    if (fs.existsSync(reportsDir)) {
      const files = fs.readdirSync(reportsDir).filter(f => f.startsWith('report_') && f.endsWith('.json'));
      files.forEach(f => {
        const preset = f.replace(/^report_/, '').replace(/\.json$/, '');
        reportsMap[preset] = JSON.parse(fs.readFileSync(path.join(reportsDir, f), 'utf8'));
      });
    }
  }
  const reportDocs = Object.entries(reportsMap).map(([preset, data]) => ({
    preset,
    title: preset.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    data,
    updated_at: new Date()
  }));
  results.reports = await bulkUpsert(Report, reportDocs, 'preset', 'Reports');

  // ── 4. Catalog ──
  console.log('\n[4/6] Syncing Report Catalog...');
  let catalogData = dataset?.catalog;
  if (!catalogData) {
    const catalogPath = path.join(backendDataDir, 'reports', 'catalog.json');
    if (fs.existsSync(catalogPath)) catalogData = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  }
  if (catalogData) {
    await Catalog.findOneAndUpdate(
      { catalog_id: 'default' },
      { $set: { catalog_id: 'default', data: catalogData, updated_at: new Date() } },
      { upsert: true }
    );
    console.log('   ✅ Catalog: upserted');
  }

  // ── 5. Organization ──
  console.log('\n[5/6] Syncing Organization Profile...');
  const orgData = dataset?.organization || {
    name: 'Boran Motors Group',
    short_name: 'Boran Motors',
    dealer_group_code: 'BOORAN-MOTORS-VIC'
  };
  await Organization.findOneAndUpdate(
    { org_id: 'default' },
    {
      $set: {
        org_id: 'default',
        name: orgData.name,
        short_name: orgData.short_name,
        dealer_group_code: orgData.dealer_group_code,
        theme: orgData.theme || {},
        current_user: orgData.current_user || {},
        meta: dataset?.meta || {},
        updated_at: new Date()
      }
    },
    { upsert: true }
  );
  console.log('   ✅ Organization: upserted');

  // ── 6. Dashboard ──
  console.log('\n[6/6] Syncing Dashboard Analytics...');
  const dashboardPath = path.join(backendDataDir, 'dashboard', 'dashboard.json');
  if (fs.existsSync(dashboardPath)) {
    const dashData = JSON.parse(fs.readFileSync(dashboardPath, 'utf8'));
    await Dashboard.findOneAndUpdate(
      { key: 'main' },
      { $set: { key: 'main', data: dashData, updated_at: new Date() } },
      { upsert: true }
    );
    console.log('   ✅ Dashboard: upserted');
  }

  // ── Summary ──
  console.log('\n====================================================');
  console.log('🎉 Sync Complete!');
  console.log('────────────────────────────────────────────────────');
  if (results.leads)    console.log(`   Leads:    ${results.leads.inserted} new  |  ${results.leads.updated} updated  |  ${results.leads.total} total`);
  if (results.rooftops) console.log(`   Rooftops: ${results.rooftops.inserted} new  |  ${results.rooftops.updated} updated  |  ${results.rooftops.total} total`);
  if (results.reports)  console.log(`   Reports:  ${results.reports.inserted} new  |  ${results.reports.updated} updated  |  ${results.reports.total} total`);
  console.log('====================================================\n');

  return results;
}

if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('❌ Sync failed:', err);
      process.exit(1);
    });
}

module.exports = runMigration;
