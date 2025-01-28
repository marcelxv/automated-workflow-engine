// validate-worker.js
const Ajv = require('ajv');
const ajv = new Ajv({ allErrors: true });

class WorkerValidator {
    constructor() {
        // Schema for worker structure
        this.workerSchema = {
            type: 'object',
            required: ['taskDefName', 'execute'],
            properties: {
                taskDefName: { type: 'string' },
                execute: { instanceof: 'Function' }
            }
        };

        // Schema for worker output
        this.outputSchema = {
            type: 'object',
            required: ['outputData', 'status'],
            properties: {
                outputData: { 
                    type: 'object'
                },
                status: { 
                    type: 'string',
                    enum: ['COMPLETED', 'FAILED', 'IN_PROGRESS']
                }
            }
        };
    }

    async validateWorker(worker, testCases) {
        console.log(`\nValidating worker: ${worker.taskDefName}`);
        const results = {
            structureValid: false,
            executionResults: [],
            errors: []
        };

        // 1. Validate worker structure
        try {
            results.structureValid = this.validateStructure(worker);
        } catch (error) {
            results.errors.push(`Structure validation error: ${error.message}`);
            return results;
        }

        // 2. Run test cases
        for (const testCase of testCases) {
            try {
                const testResult = await this.runTestCase(worker, testCase);
                results.executionResults.push(testResult);
            } catch (error) {
                results.executionResults.push({
                    testCase,
                    success: false,
                    error: error.message
                });
            }
        }

        return results;
    }

    validateStructure(worker) {
        // Check if worker has required properties
        if (!worker.taskDefName || typeof worker.execute !== 'function') {
            throw new Error('Worker must have taskDefName and execute function');
        }

        // Check execute function parameters
        const executeString = worker.execute.toString();
        if (!executeString.includes('task')) {
            throw new Error('Execute function must accept task parameter');
        }

        return true;
    }

    async runTestCase(worker, testCase) {
        const result = {
            testCase,
            success: false,
            output: null,
            error: null
        };

        try {
            // Create task object similar to Conductor's format
            const task = {
                taskType: worker.taskDefName,
                inputData: testCase.input,
                taskId: 'test-task-' + Date.now(),
                workflowInstanceId: 'test-workflow-' + Date.now(),
                status: 'SCHEDULED'
            };

            // Execute worker
            const output = await worker.execute(task);

            // Validate output structure
            const validateOutput = ajv.compile(this.outputSchema);
            if (!validateOutput(output)) {
                throw new Error(`Invalid output format: ${ajv.errorsText(validateOutput.errors)}`);
            }

            // Validate output data against expected results
            if (testCase.expectedOutput) {
                this.validateOutputData(output.outputData, testCase.expectedOutput);
            }

            result.success = true;
            result.output = output;

        } catch (error) {
            result.success = false;
            result.error = error.message;
        }

        return result;
    }

    validateOutputData(actual, expected) {
        for (const [key, value] of Object.entries(expected)) {
            if (actual[key] !== value) {
                throw new Error(`Output mismatch for ${key}: expected ${value}, got ${actual[key]}`);
            }
        }
    }
}

// Example usage
async function validateTestWorker() {
    const worker = {
        taskDefName: "testTask",
        execute: async (task) => {
            return {
                outputData: {
                    sum: Number(task.inputData?.num1) + Number(task.inputData?.num2),
                },
                status: "COMPLETED",
            };
        }
    };

    const testCases = [
        {
            name: "Basic addition",
            input: { num1: 5, num2: 3 },
            expectedOutput: { sum: 8 }
        },
        {
            name: "Handle zero",
            input: { num1: 0, num2: 0 },
            expectedOutput: { sum: 0 }
        },
        {
            name: "Handle negative numbers",
            input: { num1: -5, num2: 3 },
            expectedOutput: { sum: -2 }
        },
        {
            name: "Handle missing input",
            input: { num1: 5 },
            expectedOutput: { sum: NaN }
        }
    ];

    const validator = new WorkerValidator();
    const results = await validator.validateWorker(worker, testCases);

    // Print results
    console.log('\nValidation Results:');
    console.log('Structure Valid:', results.structureValid);
    
    console.log('\nTest Cases:');
    results.executionResults.forEach((result, index) => {
        console.log(`\nTest Case ${index + 1}: ${result.testCase.name}`);
        console.log('Success:', result.success);
        if (result.success) {
            console.log('Output:', result.output);
        } else {
            console.log('Error:', result.error);
        }
    });

    if (results.errors.length > 0) {
        console.log('\nErrors:');
        results.errors.forEach(error => console.log('-', error));
    }
}

// Run if called directly
if (require.main === module) {
    validateTestWorker().catch(console.error);
}

module.exports = WorkerValidator;