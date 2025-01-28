// test-testTask.js
const WorkerValidator = require('../scripts/validate-workers');

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
        name: "Simple addition",
        input: {
            num1: 10,
            num2: 20
        },
        expectedOutput: {
            sum: 30
        }
    },
    {
        name: "Handle negative numbers",
        input: {
            num1: -5,
            num2: 10
        },
        expectedOutput: {
            sum: 5
        }
    },
    {
        name: "Handle decimals",
        input: {
            num1: 5.5,
            num2: 2.5
        },
        expectedOutput: {
            sum: 8
        }
    }
];

async function runTests() {
    const validator = new WorkerValidator();
    const results = await validator.validateWorker(worker, testCases);
    
    // Print results in a structured format
    console.log('\n=== Worker Validation Results ===');
    console.log(`Worker: ${worker.taskDefName}`);
    console.log(`Structure Valid: ${results.structureValid ? '✅' : '❌'}`);
    
    console.log('\n=== Test Cases Results ===');
    results.executionResults.forEach((result, index) => {
        console.log(`\nTest ${index + 1}: ${result.testCase.name}`);
        if (result.success) {
            console.log('✅ Passed');
            console.log('Input:', result.testCase.input);
            console.log('Output:', result.output.outputData);
        } else {
            console.log('❌ Failed');
            console.log('Input:', result.testCase.input);
            console.log('Error:', result.error);
        }
    });

    // Print summary
    const passedTests = results.executionResults.filter(r => r.success).length;
    console.log('\n=== Summary ===');
    console.log(`Passed: ${passedTests}/${testCases.length} tests`);
    
    if (results.errors.length > 0) {
        console.log('\n=== Errors ===');
        results.errors.forEach(error => console.log('❌', error));
    }
}

runTests().catch(console.error);