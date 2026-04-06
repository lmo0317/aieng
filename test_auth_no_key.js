const axios = require('axios');
axios.post('https://aieng.duckdns.org/api/trends/save', { title: 'test' })
    .then(r => console.log('Success:', r.data))
    .catch(e => console.log('Error:', e.response ? e.response.status : e.message));
