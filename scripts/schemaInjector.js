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

        // Create schema object for workflow
        const schema = {
            createTime: Date.now(),
            updatedTime: Date.now(),
            createdBy: "workflow-automation",
            updatedBy: "workflow-automation",
            data: schemaContent.data,
            name: `${workflowContent.name}_input`,
            ownerApp: "conductor",
            version: workflowContent.version,
            type: "JSON"
        };

        // Add schema to workflow
        workflowContent.schema = schema;

        return workflowContent;
    } catch (error) {
        console.error(`❌ Error injecting schema: ${error.message}`);
        throw error;
    }
}

module.exports = { injectSchema };