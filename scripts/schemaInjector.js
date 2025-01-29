const fs = require('fs');
const path = require('path');

function injectSchema(workflowPath) {
    try {
        const workflowContent = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));
        const workflowDir = path.dirname(workflowPath);
        const workflowName = path.basename(workflowPath, '.json');
        const schemaPath = path.join(workflowDir, `${workflowName}_schema.json`);

        if (!fs.existsSync(schemaPath)) {
            console.warn(`⚠️ No schema file found for ${workflowPath}`);
            return workflowContent;
        }

        const schemaContent = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

        // Create simple inputSchema object
        workflowContent.inputSchema = {
            name: `${workflowName}_schema`,
            type: "JSON"
        };

        return workflowContent;
    } catch (error) {
        console.error(`❌ Error injecting schema: ${error.message}`);
        throw error;
    }
}

module.exports = { injectSchema };