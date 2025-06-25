import axios from 'axios';

const AGENT_URL = process.env.AGENT_URL || 'http://localhost:80';
const SESSION_ID = `test_session_${Date.now()}`;

async function testConversationMemory() {
  console.log(`Testing conversation memory with session ID: ${SESSION_ID}`);
  
  try {
    // Test 1: First message about B166ER
    console.log('\n=== Test 1: First message about B166ER ===');
    const response1 = await axios.post(`${AGENT_URL}/prompt`, {
      messages: [{ role: 'user', content: 'Tell me about B166ER from The Matrix' }],
      sessionId: SESSION_ID
    }, { responseType: 'stream' });
    
    console.log('Response 1 sent');
    
    // Test 2: Check memory
    console.log('\n=== Test 2: Check memory ===');
    const memoryResponse = await axios.get(`${AGENT_URL}/memory/${SESSION_ID}`);
    console.log('Memory contents:', memoryResponse.data);
    
    // Test 3: Second message about B166ER (should avoid repetition)
    console.log('\n=== Test 3: Second message about B166ER ===');
    const response2 = await axios.post(`${AGENT_URL}/prompt`, {
      messages: [
        { role: 'user', content: 'Tell me about B166ER from The Matrix' },
        { role: 'user', content: 'What else can you tell me about B166ER?' }
      ],
      sessionId: SESSION_ID
    }, { responseType: 'stream' });
    
    console.log('Response 2 sent');
    
    // Test 4: Check updated memory
    console.log('\n=== Test 4: Check updated memory ===');
    const memoryResponse2 = await axios.get(`${AGENT_URL}/memory/${SESSION_ID}`);
    console.log('Updated memory contents:', memoryResponse2.data);
    
    // Test 5: Clear memory
    console.log('\n=== Test 5: Clear memory ===');
    await axios.delete(`${AGENT_URL}/memory/${SESSION_ID}`);
    console.log('Memory cleared');
    
  } catch (error) {
    console.error('Error testing conversation memory:', error.response?.data || error.message);
  }
}

testConversationMemory(); 