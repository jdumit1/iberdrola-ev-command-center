import fs from 'node:fs';

const appPath = new URL('../src/App.jsx', import.meta.url);
const source = fs.readFileSync(appPath, 'utf8');

const requiredSnippets = [
  "downloadCSV('File 1.csv'",
  "downloadCSV('File 2.csv'",
  "downloadCSV('File 3.csv'",
  "const POWER_STANDARD_KW = 150;",
  "'total_proposed_stations'",
  "'total_existing_stations_baseline'",
  "'total_friction_points'",
  "'total_ev_projected_2027'",
  "'location_id'",
  "'latitude'",
  "'longitude'",
  "'route_segment'",
  "'n_chargers_proposed'",
  "'grid_status'",
  "'bottleneck_id'",
  "'distributor_network'",
  "'estimated_demand_kw'",
  "status === 'Sufficient' ? '#10b981'",
  "status === 'Moderate' ? '#eab308'",
  "#ef4444",
];

const missing = requiredSnippets.filter((snippet) => !source.includes(snippet));

if (missing.length > 0) {
  console.error('PDF rule check failed. Missing required snippets:');
  missing.forEach((snippet) => console.error(`- ${snippet}`));
  process.exit(1);
}

console.log('PDF rule check passed. Core file names, schemas, 150 kW rule, and status colors are present.');
