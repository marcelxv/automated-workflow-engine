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
    constructor(workflowsPath = './workflows') {
        // Always ensure we're looking in the workflows directory
        this.workflowsPath = workflowsPath.endsWith('workflows') ? workflowsPath : path.join(workflowsPath, 'workflows');
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

    validateWorkflowSchemaExistence(workflowFile) {
        try {
            // Get base name of the workflow file
            const workflowPath = path.dirname(workflowFile);
            const workflowBaseName = path.basename(workflowFile, '.json');
            const schemaFile = path.join(workflowPath, `${workflowBaseName}_schema.json`);

            // Check if schema file exists
            if (!fs.existsSync(schemaFile)) {
                this.logError(`No schema file found for workflow ${workflowFile}`);
                this.logError(`Expected schema file at: ${schemaFile}`);
                return null;
            }

            // Read and parse both files to verify they're valid JSON
            const workflow = JSON.parse(fs.readFileSync(workflowFile, 'utf8'));
            const schema = JSON.parse(fs.readFileSync(schemaFile, 'utf8'));

            // Verify workflow name matches schema name convention
            const expectedSchemaName = `${workflow.name}_input`;
            if (schema.name !== expectedSchemaName) {
                this.logWarning(`Schema name mismatch: expected '${expectedSchemaName}', got '${schema.name}'`);
            }

            return {
                workflow,
                schema,
                schemaFile
            };
        } catch (error) {
            this.logError(`Error validating workflow-schema relationship for ${workflowFile}: ${error.message}`);
            return null;
        }
    }

    validateWorkflowDefinition(workflowFile) {
        try {
            const workflow = JSON.parse(fs.readFileSync(workflowFile, 'utf8'));
            
            // Validate basic workflow structure
            const requiredFields = ['name', 'version', 'tasks', 'inputParameters'];
            const missingFields = requiredFields.filter(field => !workflow.hasOwnProperty(field));
            
            if (missingFields.length > 0) {
                this.logError(`Workflow ${workflowFile} is missing required fields: ${missingFields.join(', ')}`);
                return null;
            }

            // Validate tasks array
            if (!Array.isArray(workflow.tasks)) {
                this.logError(`Workflow ${workflowFile} tasks must be an array`);
                return null;
            }

            // Validate each task
            workflow.tasks.forEach((task, index) => {
                const taskRequiredFields = ['name', 'taskReferenceName', 'type'];
                const missingTaskFields = taskRequiredFields.filter(field => !task.hasOwnProperty(field));
                
                if (missingTaskFields.length > 0) {
                    this.logError(`Task ${index} in workflow ${workflowFile} is missing required fields: ${missingTaskFields.join(', ')}`);
                    return null;
                }
            });

            return workflow;
        } catch (error) {
            this.logError(`Error parsing workflow file ${workflowFile}: ${error.message}`);
            return null;
        }
    }

    validateSchemaDefinition(schemaFile) {
        try {
            const schema = JSON.parse(fs.readFileSync(schemaFile, 'utf8'));
            
            // Validate schema structure
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

            // Validate data schema structure
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
        // Validate input parameters against schema
        const schemaProperties = Object.keys(schema.data.properties);
        const workflowInputs = workflow.inputParameters;

        // Check for workflow inputs not defined in schema
        const undefinedInputs = workflowInputs.filter(input => !schemaProperties.includes(input));
        if (undefinedInputs.length > 0) {
            this.logError(`Workflow input parameters not defined in schema: ${undefinedInputs.join(', ')}`);
            return false;
        }

        // Check for required schema properties not in workflow inputs
        const requiredProperties = schema.data.required || [];
        const missingInputs = requiredProperties.filter(prop => !workflowInputs.includes(prop));
        if (missingInputs.length > 0) {
            this.logError(`Required schema properties not in workflow inputs: ${missingInputs.join(', ')}`);
            return false;
        }

        // Validate task input references
        for (const task of workflow.tasks) {
            if (task.inputParameters) {
                for (const [key, value] of Object.entries(task.inputParameters)) {
                    if (typeof value === 'string') {
                        const matches = value.match(/\${workflow\.input\.([\w.-]+)}/g) || [];
                        matches.forEach(match => {
                            const param = match.match(/\${workflow\.input\.([\w.-]+)}/)[1];
                            if (!workflowInputs.includes(param)) {
                                this.logError(`Task "${task.name}" references undefined input parameter: ${param}`);
                                return false;
                            }
                        });
                    }
                }
            }
        }

        return true;
    }

    validatePayload(payload, schema, payloadFile) {
        try {
            // Extract the actual JSON schema from the schema definition
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

    findWorkflowFiles() {
        // Explicitly look only in the workflows directory and ignore node_modules
        const workflowFiles = glob.sync('**/*.json', {
            cwd: this.workflowsPath,
            ignore: ['node_modules/**', '**/package*.json', '**/*_schema.json', '**/*_payload.json'],
            absolute: true
        });

        return workflowFiles;
    }

    validateFiles() {
        // Ensure workflows directory exists
        if (!fs.existsSync(this.workflowsPath)) {
            this.logError(`Workflows directory not found at: ${this.workflowsPath}`);
            return false;
        }

        const workflowFiles = this.findWorkflowFiles();
        let hasError = false;

        if (workflowFiles.length === 0) {
            this.logWarning('No workflow files found in workflows directory.');
            return false;
        }

        console.log(`Found ${workflowFiles.length} workflow files to validate in ${this.workflowsPath}`);

        workflowFiles.forEach(workflowFile => {
            console.log(`\nValidating workflow: ${workflowFile}`);

            // First, validate workflow-schema existence and relationship
            const workflowSet = this.validateWorkflowSchemaExistence(workflowFile);
            if (!workflowSet) {
                hasError = true;
                return;
            }

            try {
                const { workflow, schema, schemaFile } = workflowSet;

                // Validate workflow definition
                const workflowValid = this.validateWorkflowDefinition(workflowFile);
                if (!workflowValid) {
                    hasError = true;
                    return;
                }

                // Validate schema definition
                const schemaValid = this.validateSchemaDefinition(schemaFile);
                if (!schemaValid) {
                    hasError = true;
                    return;
                }

                // Validate workflow against schema
                if (!this.validateWorkflowAgainstSchema(workflow, schema)) {
                    hasError = true;
                    return;
                }

                // Check for and validate payload if it exists
                const payloadFile = workflowFile.replace('.json', '_payload.json');
                if (fs.existsSync(payloadFile)) {
                    const payloadData = JSON.parse(fs.readFileSync(payloadFile, 'utf8'));
                    if (!this.validatePayload(payloadData, schema, payloadFile)) {
                        hasError = true;
                        return;
                    }
                } else {
                    this.logWarning(`No payload file found at: ${payloadFile}`);
                }

                this.logSuccess(`All validations passed for workflow: ${workflowFile}`);

            } catch (error) {
                this.logError(`Error processing workflow ${workflowFile}: ${error.message}`);
                hasError = true;
            }
        });

        // Print summary with proper error counting
        console.log('\n=== Validation Summary ===');
        console.log(`Total Workflows: ${workflowFiles.length}`);
        console.log(`Errors: ${this.errors.length}`);
        console.log(`Warnings: ${this.warnings.length}`);

        // Print detailed errors if any
        if (this.errors.length > 0) {
            console.log('\nErrors:');
            this.errors.forEach((error, index) => {
                console.log(`${index + 1}. ${error}`);
            });
        }

        // Print warnings if any
        if (this.warnings.length > 0) {
            console.log('\nWarnings:');
            this.warnings.forEach((warning, index) => {
                console.log(`${index + 1}. ${warning}`);
            });
        }

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