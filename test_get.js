const axios = require('axios');
axios.get('http://aieng.cafe24app.com/api/trends/saved')
    .then(r => console.log('Trends count:', r.data.trends.length))
    .catch(e => console.log('Error:', e.message));
