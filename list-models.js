const axios = require('axios');
require('dotenv').config();

const apiKey = process.env.GEMINI_API_KEY;

axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
.then(response => {
    console.log('Available models:');
    response.data.models.forEach(m => {
        if (m.name.includes('flash') || m.name.includes('audio') || m.displayName.includes('Audio')) {
            console.log('  -', m.name);
            console.log('    Display:', m.displayName);
            console.log('    Methods:', m.supportedMethods?.join(', '));
            console.log('');
        }
    });
})
.catch(err => console.error('Error:', err.response?.data || err.message));
