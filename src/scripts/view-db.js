const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const connectDB = require('../config/db');
const Lead = require('../models/Lead');
const Rooftop = require('../models/Rooftop');
const Report = require('../models/Report');
const Dashboard = require('../models/Dashboard');
const Organization = require('../models/Organization');

async function showDbData() {
  console.log('\n====================================================');
  console.log('📊 Boran Motors CRM — MongoDB Database Inspector');
  console.log('====================================================\n');

  const conn = await connectDB();
  if (!conn) {
    console.error('❌ Could not connect to database. Check MONGODB_URI in .env');
    process.exit(1);
  }

  // 1. Overview counts
  const [leadCount, rooftopCount, reportCount, dashCount, orgCount] = await Promise.all([
    Lead.countDocuments(),
    Rooftop.countDocuments(),
    Report.countDocuments(),
    Dashboard.countDocuments(),
    Organization.countDocuments()
  ]);

  console.log('📈 Collection Summary:');
  console.log(`  • Leads:         ${leadCount.toLocaleString()} records`);
  console.log(`  • Rooftops:      ${rooftopCount} dealerships`);
  console.log(`  • Reports:       ${reportCount} presets`);
  console.log(`  • Dashboards:    ${dashCount} record`);
  console.log(`  • Organizations: ${orgCount} record\n`);

  // 2. Leads by Dealership
  if (leadCount > 0) {
    const leadsByDealership = await Lead.aggregate([
      { $group: { _id: '$dealership_name', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    console.log('🏢 Leads Per Dealership:');
    leadsByDealership.forEach(d => {
      console.log(`  • ${d._id || 'Unknown'}: ${d.count.toLocaleString()} leads`);
    });
    console.log('');

    // 3. Sample Recent Leads
    const sampleLeads = await Lead.find({})
      .sort({ created_at: -1 })
      .limit(5)
      .select('customer_name dealership_name vehicle_make vehicle_model status created_at');

    console.log('🔍 5 Most Recent Leads in MongoDB:');
    sampleLeads.forEach((l, idx) => {
      const vehicle = [l.vehicle_make, l.vehicle_model].filter(Boolean).join(' ') || 'N/A';
      console.log(`  ${idx + 1}. [${l.dealership_name}] ${l.customer_name} — ${vehicle} (${l.status}) | ${l.created_at || 'No date'}`);
    });
  } else {
    console.log('⚠️ Database is empty. Run: npm run migrate');
  }

  console.log('\n====================================================\n');
  process.exit(0);
}

showDbData().catch(err => {
  console.error('Error querying database:', err);
  process.exit(1);
});
