const axios = require('axios');
axios.post('http://aieng.cafe24app.com/api/trends/save', { title: 'test' }, {
    headers: { 'Authorization': 'Bearer 01d64a94fbedd7e7ae4003dd4fdf7dae26a197d7fd0af8ba2cf8afe108013d0c' }
})
    .then(r => console.log('Success:', r.data))
    .catch(e => console.log('Error:', e.response ? e.response.status : e.message));
