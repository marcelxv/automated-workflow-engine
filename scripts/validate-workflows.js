const Ajv = require('ajv');
const ajv = new Ajv({
    strict: false,
    allErrors: true,
    verbose: true
});
require('ajv-formats')(ajv);
const fs = require('fs');
const path = require('path');
const glob = require('glob');

class OrkesValidator {
    constructor(workflowsPath = './') {
        this.workflowsPath = workflowsPath;
        this.errors = [];
        this.warnings = [];
    }

    logError(message) {
        console.error(`❌ ${message}`);
        this.errors.push(message);
    }

    logWarning(message) {
        console.warn(`⚠️ ${message}`);
        this.warnings.push(message);
    }

    logSuccess(message) {
        console.log(`✅ ${message}`);
    }

    // Find all workflow base names (without extensions)
    findWorkflowSets() {
        const allFiles = glob.sync(path.join(this.workflowsPath, '**/*.json'));
        const workflowSets = new Set();

        allFiles.forEach(file => {
            const filename = path.basename(file);
            // Match files that don't end with _schema or _payload
            if (!filename.endsWith('_schema.json') && !filename.endsWith('_payload.json')) {
                const baseName = path.basename(file, '.json');
                const schemaFile = path.join(path.dirname(file), `${baseName}_schema.json`);
                const payloadFile = path.join(path.dirname(file), `${baseName}_payload.json`);
                
                // Only add if schema and payload files exist
                if (fs.existsSync(schemaFile) && fs.existsSync(payloadFile)) {
                    workflowSets.add({
                        workflow: file,
                        schema: schemaFile,
                        payload: payloadFile,
                        baseName: baseName
                    });
                }
            }
        });

        return Array.from(workflowSets);
    }

    // Previous validation methods remain the same
    validateWorkflowDefinition(workflowFile) {
        try {
            const workflow = JSON.parse(fs.readFileSync(workflowFile, 'utf8'));
            
            const requiredFields = ['name', 'version', 'tasks', 'inputParameters'];
            const missingFields = requiredFields.filter(field => !workflow.hasOwnProperty(field));
            
            if (missingFields.length > 0) {
                this.logError(`Workflow ${workflowFile} is missing required fields: ${missingFields.join(', ')}`);
                return null;
            }

            return workflow;
        } catch (error) {
            this.logError(`Error parsing workflow file ${workflowFile}: ${error.message}`);
            return null;
        }
    }

    validateSchemaDefinition(schemaFile) {
        // Previous implementation remains the same
        try {
            const schema = JSON.parse(fs.readFileSync(schemaFile, 'utf8'));
            
            const requiredFields = ['name', 'version', 'type', 'data'];
            const missingFields = requiredFields.filter(field => !schema.hasOwnProperty(field));
            
            if (missingFields.length > 0) {
                this.logError(`Schema ${schemaFile} is missing required fields: ${missingFields.join(', ')}`);
                return null;
            }

            if (schema.type !== 'JSON') {
                this.logError(`Schema ${schemaFile} has invalid type. Expected 'JSON', got '${schema.type}'`);
                return null;
            }

            if (!schema.data.$schema || !schema.data.type || !schema.data.properties) {
                this.logError(`Schema ${schemaFile} has invalid JSON Schema structure in data field`);
                return null;
            }

            return schema;
        } catch (error) {
            this.logError(`Error parsing schema file ${schemaFile}: ${error.message}`);
            return null;
        }
    }

    validateWorkflowAgainstSchema(workflow, schema) {
        // Previous implementation remains the same
        const schemaProperties = Object.keys(schema.data.properties);
        const workflowInputs = workflow.inputParameters;

        const undefinedInputs = workflowInputs.filter(input => !schemaProperties.includes(input));
        if (undefinedInputs.length > 0) {
            this.logError(`Workflow input parameters not defined in schema: ${undefinedInputs.join(', ')}`);
            return false;
        }

        const requiredProperties = schema.data.required || [];
        const missingInputs = requiredProperties.filter(prop => !workflowInputs.includes(prop));
        if (missingInputs.length > 0) {
            this.logError(`Required schema properties not in workflow inputs: ${missingInputs.join(', ')}`);
            return false;
        }

        for (const task of workflow.tasks) {
            if (task.inputParameters) {
                for (const [key, value] of Object.entries(task.inputParameters)) {
                    if (typeof value === 'string') {
                        const matches = value.match(/\${workflow\.input\.([\w.-]+)}/g) || [];
                        matches.forEach(match => {
                            const param = match.match(/\${workflow\.input\.([\w.-]+)}/)[1];
                            if (!workflowInputs.includes(param)) {
                                this.logError(`Task "${task.name}" references undefined input parameter: ${param}`);
                            }
                        });
                    }
                }
            }
        }

        return true;
    }

    validatePayload(payload, schema, payloadFile) {
        // Previous implementation remains the same
        try {
            const validate = ajv.compile(schema.data);
            const valid = validate(payload);

            if (!valid) {
                this.logError(`Payload validation failed for ${payloadFile}:`);
                validate.errors.forEach(error => {
                    this.logError(`- ${error.instancePath}: ${error.message}`);
                });
                return false;
            }

            this.logSuccess(`Payload ${payloadFile} is valid`);
            return true;
        } catch (error) {
            this.logError(`Error validating payload ${payloadFile}: ${error.message}`);
            return false;
        }
    }

    validateFiles() {
        const workflowSets = this.findWorkflowSets();
        let hasError = false;

        if (workflowSets.length === 0) {
            this.logWarning('No complete workflow sets found. Each workflow should have corresponding _schema.json and _payload.json files.');
            return false;
        }

        workflowSets.forEach(({workflow, schema, payload, baseName}) => {
            console.log(`\nValidating workflow set: ${baseName}`);

            try {
                // Validate workflow definition
                const workflowDef = this.validateWorkflowDefinition(workflow);
                if (!workflowDef) {
                    hasError = true;
                    return;
                }

                // Validate schema definition
                const schemaDef = this.validateSchemaDefinition(schema);
                if (!schemaDef) {
                    hasError = true;
                    return;
                }

                // Validate workflow against schema
                if (!this.validateWorkflowAgainstSchema(workflowDef, schemaDef)) {
                    hasError = true;
                    return;
                }

                // Validate payload against schema
                const payloadData = JSON.parse(fs.readFileSync(payload, 'utf8'));
                if (!this.validatePayload(payloadData, schemaDef, payload)) {
                    hasError = true;
                    return;
                }

                this.logSuccess(`All validations passed for workflow set: ${baseName}`);

            } catch (error) {
                this.logError(`Error processing workflow set ${baseName}: ${error.message}`);
                hasError = true;
            }
        });

        // Print summary
        console.log('\n=== Validation Summary ===');
        console.log(`Total Workflow Sets: ${workflowSets.length}`);
        console.log(`Errors: ${this.errors.length}`);
        console.log(`Warnings: ${this.warnings.length}`);

        return !hasError;
    }
}

// Run validation if called directly
if (require.main === module) {
    const validator = new OrkesValidator(process.argv[2]);
    const isValid = validator.validateFiles();
    process.exit(isValid ? 0 : 1);
}

module.exports = OrkesValidator;