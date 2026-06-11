const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, 'backend', 'models');
const modelsToUpdate = [
  'AssemblyBatch.js', 'Attendance.js', 'ChainInventory.js',
  'Employee.js', 'GateEntry.js', 'Invoice.js', 'Material.js',
  'Notification.js', 'Order.js', 'Payroll.js', 'ProductionPlan.js',
  'PurchaseOrder.js', 'RackBin.js', 'ShortageReport.js',
  'Vendor.js', 'WipBatch.js'
];

modelsToUpdate.forEach(file => {
  const filePath = path.join(modelsDir, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    if (!content.includes('tenantPlugin')) {
      // Find where module.exports is
      const exportRegex = /module\.exports\s*=\s*mongoose\.model/;
      if (exportRegex.test(content)) {
        // Find the schema variable name (e.g. const gateEntrySchema = new mongoose.Schema)
        const schemaRegex = /const\s+(\w+Schema)\s*=\s*new\s+mongoose\.Schema/i;
        const match = content.match(schemaRegex);
        if (match && match[1]) {
          const schemaName = match[1];
          // Replace module.exports line with plugin injection first
          content = content.replace(exportRegex, `const tenantPlugin = require('../utils/tenantPlugin');\n${schemaName}.plugin(tenantPlugin);\n\nmodule.exports = mongoose.model`);
          fs.writeFileSync(filePath, content);
          console.log(`Updated ${file}`);
        } else {
          console.log(`Could not find schema name in ${file}`);
        }
      }
    }
  }
});
