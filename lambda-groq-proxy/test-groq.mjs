// test-groq.mjs
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: ''  // 替换成你的密钥
});

async function testGroq() {
  try {
    console.log('Testing Groq API...');

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: 'Say "Hello World"' }],
      temperature: 0.3,
      max_tokens: 50
    });

    console.log('✅ Success!');
    console.log('Response:', completion.choices[0].message.content);
    console.log('\nFull response:', JSON.stringify(completion, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Status:', error.status);
  }
}

testGroq();
