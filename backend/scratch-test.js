const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const testChat = async () => {
  try {
    console.log('Logging in as superadmin...');
    const loginRes = await axios.post('http://localhost:9898/api/auth/login', {
      email: 'superadmin@trackbells.com',
      password: 'SuperAdmin@TrackBells2026'
    });

    const token = loginRes.data.token;
    console.log('Login successful! Token acquired.');

    console.log('Sending chat request...');
    const response = await axios.post('http://localhost:9898/api/ai/chat', 
      { message: 'Check status for guard@strdrg.com' },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );
    console.log('Response status:', response.status);
    console.log('Response data:', response.data);
  } catch (error) {
    console.error('Error occurred:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error(error.message);
    }
  }
};

testChat();
