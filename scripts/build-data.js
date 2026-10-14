const fs = require('fs');
const path = require('path');

// Paths relative to this script (backend/scripts/build-data.js)
const backendDir = path.resolve(__dirname, '..');          // backend/
const projectRoot = path.resolve(backendDir, '..');        // project root
const frontendDir = fs.existsSync(path.resolve(projectRoot, 'flwup-frontend'))
  ? path.resolve(projectRoot, 'flwup-frontend')
  : path.resolve(projectRoot, 'frontend');
const dataDir = fs.existsSync(path.join(backendDir, 'network_leads'))
  ? backendDir
  : path.resolve(backendDir, 'data');
const outDir = path.resolve(frontendDir, 'src', 'data');   // frontend/src/data/

function loadAllData() {
  console.log('📦 Boran Motors CRM — Data Compiler');
  console.log('────────────────────────────────────');
  console.log(`📂 Reading from: ${dataDir}`);
  console.log(`📤 Writing to:   ${outDir}\n`);

  // 1. Rooftops
  const rooftopsPath = path.join(dataDir, 'network_leads', 'rooftops.json');
  let rooftopsData = { role: 'group_marketing', rooftops: [] };
  if (fs.existsSync(rooftopsPath)) {
    rooftopsData = JSON.parse(fs.readFileSync(rooftopsPath, 'utf8'));
    console.log(`✅ Rooftops: ${rooftopsData.rooftops?.length || 0} dealerships`);
  } else {
    console.warn(`⚠️  rooftops.json not found at ${rooftopsPath}`);
  }

  // 2. Leads across all rooftops
  const leadsDir = path.join(dataDir, 'network_leads');
  const leadFiles = fs.existsSync(leadsDir)
    ? fs.readdirSync(leadsDir).filter(f => f.startsWith('leads_') && f.endsWith('.json'))
    : [];

  const dealershipsMap = {};
  const allLeads = [];

  leadFiles.forEach(file => {
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(leadsDir, file), 'utf8'));
      if (!raw || !raw.name) return;
      const leadsList = raw.leads?.data || (Array.isArray(raw.leads) ? raw.leads : []);

    dealershipsMap[raw.dealership_id] = {
      id: raw.dealership_id,
      name: raw.name,
      range: raw.range,
      count: leadsList.length,
      file: file
    };

    leadsList.forEach(lead => {
      allLeads.push({
        ...lead,
        dealership_name: lead.dealership_name || raw.name,
        customer_name: (lead.customer_name || 'Anonymous Customer').trim(),
        vehicle_make: (lead.vehicle_make || 'Unknown').trim(),
        vehicle_model: (lead.vehicle_model || '').trim(),
        owner_name: (lead.owner_name || 'Unassigned').trim(),
        status: lead.status || 'following_up',
        created_at: lead.created_at || new Date().toISOString(),
        minutes_to_first_contact: typeof lead.minutes_to_first_contact === 'number' ? lead.minutes_to_first_contact : null,
        minutes_to_first_touch: typeof lead.minutes_to_first_touch === 'number' ? lead.minutes_to_first_touch : null,
        follow_ups_sent: typeof lead.follow_ups_sent === 'number' ? lead.follow_ups_sent : 0,
        source: (lead.source || 'manual').trim(),
        dealer_code: (lead.dealer_code || 'BOORAN').trim(),
        
        // Pentana System of Record Data
        pentana_id: 'PENTANA-' + Math.floor(Math.random() * 10000000),
        store_code: Math.random() > 0.5 ? 'Store 70' : 'Store 40',
        
        // AI & Comms Configuration
        ai_status: Math.random() > 0.1 ? 'active' : 'off', // AI Off button for sales staff
        ai_schedule_preference: 'after_hours', // Preference to send messages after 6pm
        ai_queued_messages: [
          { id: 1, type: 'sms', content: 'Hi, are you still interested?', scheduled_for: '2026-10-08T18:30:00Z', editable: true }
        ],
        
        // Diary & CRM Logging
        diary_entries: [
          { date: lead.created_at || new Date().toISOString(), user: 'System', note: 'Lead created via Pentana integration.' }
        ],
        
        // Sales App Features (Licence, Test Drive, Value, Loan)
        test_drive: {
          status: Math.random() > 0.8 ? 'completed' : 'none',
          licence_captured: Math.random() > 0.8
        },
        trade_in: {
          status: Math.random() > 0.9 ? 'valued' : 'none',
          value: null
        },
        loan_car: { status: 'none' },
        
        // Post Sales
        post_sales_followup: {
          status: lead.status === 'sold' ? 'scheduled' : 'n/a',
          next_contact: null
        },
        
        // Video Integration
        videos_sent: Math.random() > 0.7 ? [
          { id: 'v123', sent_via: 'sms', interacted: true, interacted_at: '2026-10-07T14:30:00Z', is_snippet_blend: true, no_time_cap: true }
        ] : []
      });
    });

    console.log(`✅ ${raw.name}: ${leadsList.length} leads (${file})`);
    } catch (err) {
      // ignore unparseable or error dump files
    }
  });

  // 3. Reports
  const reportsDir = path.join(dataDir, 'reports');
  const reportsMap = {};
  let catalog = null;

  if (fs.existsSync(reportsDir)) {
    const reportFiles = fs.readdirSync(reportsDir).filter(f => f.endsWith('.json'));
    reportFiles.forEach(file => {
      const data = JSON.parse(fs.readFileSync(path.join(reportsDir, file), 'utf8'));
      if (file === 'catalog.json') {
        catalog = data;
      } else {
        const presetKey = file.replace(/^report_/, '').replace(/\.json$/, '');
        reportsMap[presetKey] = data;
      }
    });
    console.log(`✅ Reports: ${Object.keys(reportsMap).length} presets + catalog`);
  }

  // 4. Dashboard data
  const dashboardPath = path.join(dataDir, 'dashboard', 'dashboard.json');
  let dashboardData = null;
  if (fs.existsSync(dashboardPath)) {
    dashboardData = JSON.parse(fs.readFileSync(dashboardPath, 'utf8'));
    console.log(`✅ Dashboard: loaded`);
  }

  // --- Aggregated filter values ---
  const distinct = (arr) => Array.from(new Set(arr.filter(Boolean))).sort();
  const distinctDealerships = distinct(allLeads.map(l => l.dealership_name));
  const distinctMakes = distinct(allLeads.map(l => l.vehicle_make));
  const distinctOwners = distinct(allLeads.map(l => l.owner_name));
  const distinctSources = distinct(allLeads.map(l => l.source));

  // --- KPI calculations ---
  const total = allLeads.length;
  const contacted = allLeads.filter(l => l.first_contact_at || l.minutes_to_first_contact !== null);
  const touched15m = allLeads.filter(l => l.minutes_to_first_contact !== null && l.minutes_to_first_contact <= 15);
  const replied = allLeads.filter(l => l.first_reply_at !== null);
  const sold = allLeads.filter(l => l.status === 'sold' || l.sold_at !== null);

  const validTimes = allLeads
    .map(l => l.minutes_to_first_contact)
    .filter(t => typeof t === 'number' && t >= 0)
    .sort((a, b) => a - b);
  const medianMinutesToContact = validTimes.length > 0
    ? validTimes[Math.floor(validTimes.length / 2)]
    : 0;

  // --- Compile final dataset ---
  const dataset = {
    generated_at: new Date().toISOString(),
    organization: {
      name: 'Boran Motors Group',
      short_name: 'Boran Motors',
      dealer_group_code: 'BOORAN-MOTORS-VIC',
      theme: {
        primary: '#C8102E',
        darkRed: '#A50D26',
        white: '#FFFFFF',
        lightGrey: '#F5F5F5',
        borderGrey: '#E5E7EB',
        textPrimary: '#1F2937',
        textSecondary: '#6B7280'
      },
      current_user: {
        name: 'Megan Taylor',
        role: 'Group Marketing & Operations',
        email: 'megant@booranmotors.com.au',
        avatar: 'MT',
        role_label: 'Group Marketing'
      }
    },
    meta: {
      total_leads: total,
      dealership_count: rooftopsData.rooftops?.length || 4,
      date_range: { from: '2026-07-10', to: '2026-10-07' },
      kpis: {
        total_leads: total,
        contact_coverage_rate: ((contacted.length / (total || 1)) * 100).toFixed(1),
        touched_15m_rate: ((touched15m.length / (total || 1)) * 100).toFixed(1),
        median_minutes_to_contact: medianMinutesToContact,
        reply_rate: ((replied.length / (total || 1)) * 100).toFixed(1),
        sold_count: sold.length,
        sold_rate: ((sold.length / (total || 1)) * 100).toFixed(1)
      },
      filter_options: {
        dealerships: distinctDealerships,
        makes: distinctMakes,
        owners: distinctOwners,
        sources: distinctSources
      }
    },
    rooftops: rooftopsData.rooftops || [],
    dealerships_summary: dealershipsMap,
    reports: reportsMap,
    catalog: catalog,
    leads: allLeads
  };

  // --- Write output files ---
  fs.mkdirSync(outDir, { recursive: true });

  const datasetPath = path.join(outDir, 'dataset.json');
  fs.writeFileSync(datasetPath, JSON.stringify(dataset, null, 2), 'utf8');

  // JS data store module
  const storeContent = `// Auto-generated data module — run 'npm run build-data' in backend/ to refresh
import dataset from './dataset.json';

export const crmData = dataset;
export const leads = dataset.leads;
export const rooftops = dataset.rooftops;
export const reports = dataset.reports;
export const catalog = dataset.catalog;
export const kpis = dataset.meta.kpis;
export const filterOptions = dataset.meta.filter_options;
export const orgInfo = dataset.organization;

export default dataset;
`;
  fs.writeFileSync(path.join(outDir, 'store.js'), storeContent, 'utf8');

  console.log('\n────────────────────────────────────');
  console.log(`✅ dataset.json  →  ${path.relative(projectRoot, datasetPath)}`);
  console.log(`✅ store.js      →  ${path.relative(projectRoot, path.join(outDir, 'store.js'))}`);
  console.log(`\n🚀 Total leads compiled: ${total.toLocaleString()} across ${distinctDealerships.length} dealerships`);
  console.log('────────────────────────────────────\n');
}

loadAllData();
