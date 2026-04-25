const axios = require('axios');
axios.post('https://minohlee.mooo.com/api/trends/save', { title: 'test' })
    .then(r => console.log('Success:', r.data))
    .catch(e => console.log('Error:', e.response ? e.response.status : e.message));
