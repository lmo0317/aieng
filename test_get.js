const axios = require('axios');
axios.get('https://aieng.duckdns.org/api/trends/saved')
    .then(r => console.log('Trends count:', r.data.trends.length))
    .catch(e => console.log('Error:', e.message));
