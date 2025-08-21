const fs = require('fs');
const path = require('path');

// Mock the dl object and browser environment
global.dl = {
    datasets: {
        get: async () => ({ id: 'test-dataset-123' })
    },
    sendEvent: (event) => {
        console.log('[DL-EVENT]', event.name, event.payload);
    }
};

global.document = {
    cookie: 'JWT=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IlFqQTVPRVF3Umpnek9ESXdNa1E1UmpjMU5VVXpRMFJGTXpsRE9URTBOMEZGUVVZMk0wWkJPQSJ9.eyJodHRwczovL2RhdGFsb29wLmFpL2F1dGhvcml6YXRpb24iOnsiY29ubmVjdGlvbklkZW50aXRpZXMiOlsiZ29vZ2xlLW9hdXRoMiJdLCJncm91cHMiOlsiYWRtaW5zIiwicGlwZXIiXSwicm9sZXMiOlsiYWRtaW4iXSwidXNlcl90eXBlIjoiaHVtYW4ifSwiZ2l2ZW5fbmFtZSI6Ik9yIiwiZmFtaWx5X25hbWUiOiJTaGFidGF5Iiwibmlja25hbWUiOiJvciIsIm5hbWUiOiJPciBTaGFidGF5IiwicGljdHVyZSI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0otZjdEMTg0UG51Nkk1NFlId1lhRTRab2h3bTJjOFFyV1o0UE1DdWdZX1N5d1czbHc9czk2LWMiLCJ1cGRhdGVkX2F0IjoiMjAyNS0wOC0xOFQwOToyNDo1NS44NjFaIiwiZW1haWwiOiJvckBkYXRhbG9vcC5haSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJpc3MiOiJodHRwczovL2RhdGFsb29wLXByb2R1Y3Rpb24uYXV0aDAuY29tLyIsImF1ZCI6IkZyRzBIWmdhMUNLNVVWVVNKSnVEa1NEcUl0UGllV0dXIiwic3ViIjoiZ29vZ2xlLW9hdXRoMnwxMDUwMDQwOTU3NzE5Njg1ODU4MTYiLCJpYXQiOjE3NTU3NjQ1ODcsImV4cCI6MTc1NTg1MDk4Nywic2lkIjoiTXlnWUVsd1AxQUpGcHVZQUFfam5NcnBJWXlKekIzN1giLCJjX2hhc2giOiJsbk9EY013SDNsRlJ0d1JKTnJNc293Iiwibm9uY2UiOiJNNEZYcFpqT2FUS0VDTnllLVRtRVJ-d3AwSHI1cjBqYiJ9.AwIDXB-EYNAg3DJCO8CAPOfOugh_qZ3NPDs-wmWB2jod4KUZ5eUYoLlPVYjLKavvU2TroWn5qvWonRsjMmeXqAKAALgvULYHhX_glN06Gv4BRZLeGD6kLEZpMYtCxZ_2816zbs5_Y4OOghWzd2iHSKZ1wkb2wMnXWT-re3x8RsGLOZ4h5NBSjokLX31seWs3Cmvd0zxFb-MJeHKKsPE2myRJ-4ZXup_11N3JBI-aaI419EyH9cufyDD-9tn37h1afrSH5MFFkEnF4qJeCKI31Y5OFH0f2PDv9HJH4O3DVwZ1jCoA8gctl_7cysZxbkwiQ62eLtgDPswajcsiW4UyLw'
};

// Mock fetch for Node.js
global.fetch = require('node-fetch');

async function testEntireJS() {
    try {
        console.log('[TEST] Starting test of entire.js');
        
        // Read and execute the entire.js file
        const entireJS = fs.readFileSync(path.join(__dirname, 'entire.js'), 'utf8');
        
        // Create a function from the code
        const runFunction = new Function('textInput', 'itemsQuery', entireJS + '\nreturn run(textInput, itemsQuery);');
        
        // Test the function
        const testInput = { "Text Box": "find all images with people" };
        const testItemsQuery = null;
        
        console.log('[TEST] Calling run function with:', testInput);
        const result = await runFunction(testInput, testItemsQuery);
        
        console.log('[TEST] ✅ Test completed successfully!');
        console.log('[TEST] Generated query:', JSON.stringify(result, null, 2));
        
        return result;
    } catch (error) {
        console.error('[TEST] ❌ Test failed:', error.message);
        if (error.stack) {
            console.error('[TEST] Stack:', error.stack);
        }
        throw error;
    }
}

// Run the test
if (require.main === module) {
    testEntireJS()
        .then(() => {
            console.log("✅ Test completed successfully!");
            process.exit(0);
        })
        .catch((error) => {
            console.error("❌ Test failed:", error.message);
            process.exit(1);
        });
}

module.exports = { testEntireJS };
