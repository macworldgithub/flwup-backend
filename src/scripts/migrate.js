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

async function runMigration() {
  console.log('====================================================');
  console.log('🚀 Starting Data Migration: JSON Files -> Local MongoDB');
  console.log('====================================================\n');

  await connectDB();

  // Paths
  const backendDir = path.resolve(__dirname, '../..');
  const backendDataDir = fs.existsSync(path.join(backendDir, 'network_leads'))
    ? backendDir
    : path.resolve(backendDir, 'data');
  const frontendDatasetPath = path.resolve(__dirname, '../../../flwup-frontend/src/data/dataset.json');

  let dataset = null;
  if (fs.existsSync(frontendDatasetPath)) {
    console.log(`📂 Found compiled dataset: ${frontendDatasetPath}`);
    dataset = JSON.parse(fs.readFileSync(frontendDatasetPath, 'utf8'));
  } else {
    console.warn(`⚠️ dataset.json not found at ${frontendDatasetPath}, falling back to backend/data`);
  }

  // 1. Migrate Leads
  let leadsToMigrate = [];
  if (dataset && Array.isArray(dataset.leads)) {
    leadsToMigrate = dataset.leads;
  } else {
    // Fallback: Read raw network leads files
    const leadsDir = path.join(backendDataDir, 'network_leads');
    if (fs.existsSync(leadsDir)) {
      const files = fs.readdirSync(leadsDir).filter(f => f.startsWith('leads_') && f.endsWith('.json'));
      files.forEach(f => {
        const raw = JSON.parse(fs.readFileSync(path.join(leadsDir, f), 'utf8'));
        const list = raw.leads?.data || (Array.isArray(raw.leads) ? raw.leads : []);
        list.forEach(l => {
          leadsToMigrate.push({
            ...l,
            dealership_name: l.dealership_name || raw.name,
            pentana_id: 'PENTANA-' + Math.floor(Math.random() * 10000000),
            store_code: Math.random() > 0.5 ? 'Store 70' : 'Store 40',
            ai_status: 'active',
            diary_entries: [{ date: new Date().toISOString(), user: 'System', note: 'Migrated from JSON' }]
          });
        });
      });
    }
  }

  if (leadsToMigrate.length > 0) {
    console.log(`⏳ Migrating ${leadsToMigrate.length} leads into MongoDB...`);
    // Clear existing leads or bulk upsert
    await Lead.deleteMany({});
    
    // Batch insert for performance
    const batchSize = 500;
    for (let i = 0; i < leadsToMigrate.length; i += batchSize) {
      const batch = leadsToMigrate.slice(i, i + batchSize);
      await Lead.insertMany(batch, { ordered: false });
    }
    const leadCount = await Lead.countDocuments();
    console.log(`✅ Leads Migrated Successfully: ${leadCount} records stored.`);
  }

  // 2. Migrate Rooftops
  let rooftopsToMigrate = [];
  if (dataset && Array.isArray(dataset.rooftops)) {
    rooftopsToMigrate = dataset.rooftops;
  } else {
    const rooftopsPath = path.join(backendDataDir, 'network_leads', 'rooftops.json');
    if (fs.existsSync(rooftopsPath)) {
      const raw = JSON.parse(fs.readFileSync(rooftopsPath, 'utf8'));
      rooftopsToMigrate = raw.rooftops || [];
    }
  }

  if (rooftopsToMigrate.length > 0) {
    console.log(`⏳ Migrating ${rooftopsToMigrate.length} rooftops...`);
    await Rooftop.deleteMany({});
    await Rooftop.insertMany(rooftopsToMigrate);
    const rooftopCount = await Rooftop.countDocuments();
    console.log(`✅ Rooftops Migrated: ${rooftopCount} dealerships stored.`);
  }

  // 3. Migrate Reports
  const reportsMap = dataset?.reports || {};
  // If not found in dataset, check reports directory
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

  const reportPresets = Object.keys(reportsMap);
  if (reportPresets.length > 0) {
    console.log(`⏳ Migrating ${reportPresets.length} report presets...`);
    await Report.deleteMany({});
    const reportDocs = reportPresets.map(preset => ({
      preset,
      title: preset.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      data: reportsMap[preset],
      updated_at: new Date()
    }));
    await Report.insertMany(reportDocs);
    const reportCount = await Report.countDocuments();
    console.log(`✅ Reports Migrated: ${reportCount} report presets stored.`);
  }

  // 4. Migrate Catalog
  let catalogData = dataset?.catalog;
  if (!catalogData) {
    const catalogPath = path.join(backendDataDir, 'reports', 'catalog.json');
    if (fs.existsSync(catalogPath)) {
      catalogData = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
    }
  }
  if (catalogData) {
    await Catalog.findOneAndUpdate(
      { catalog_id: 'default' },
      { catalog_id: 'default', data: catalogData },
      { upsert: true, returnDocument: 'after' }
    );
    console.log(`✅ Report Catalog Migrated.`);
  }

  // 5. Migrate Organization & Metadata
  const orgData = dataset?.organization || {
    name: 'Boran Motors Group',
    short_name: 'Boran Motors',
    dealer_group_code: 'BOORAN-MOTORS-VIC'
  };
  await Organization.findOneAndUpdate(
    { org_id: 'default' },
    {
      org_id: 'default',
      name: orgData.name,
      short_name: orgData.short_name,
      dealer_group_code: orgData.dealer_group_code,
      theme: orgData.theme || {},
      current_user: orgData.current_user || {},
      meta: dataset?.meta || {}
    },
    { upsert: true, returnDocument: 'after' }
  );
  console.log(`✅ Organization Profile & Theme Migrated.`);

  // 6. Migrate Dashboard data
  const dashboardPath = path.join(backendDataDir, 'dashboard', 'dashboard.json');
  if (fs.existsSync(dashboardPath)) {
    const dashData = JSON.parse(fs.readFileSync(dashboardPath, 'utf8'));
    await Dashboard.findOneAndUpdate(
      { key: 'main' },
      { key: 'main', data: dashData },
      { upsert: true, returnDocument: 'after' }
    );
    console.log(`✅ Dashboard Analytics Data Migrated.`);
  }

  console.log('\n====================================================');
  console.log('🎉 Migration Completed Successfully!');
  console.log('====================================================\n');
  return true;
}

if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('❌ Migration failed:', err);
      process.exit(1);
    });
}

module.exports = runMigration;
