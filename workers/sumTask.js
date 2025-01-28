export const worker = {
    taskDefName: "testTask",
    execute: async (task) => {
        console.log(task)
        return {
            outputData: {
            sum: Number(task.inputData?.num1) + Number(task.inputData?.num2),
            },
            status: "COMPLETED",
        };
        }
    };

    