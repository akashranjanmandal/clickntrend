const baseUrl = 'http://localhost:5000';

async function testEndpoint(name, url) {
  try {
    console.log(`Testing ${name}...`);
    const response = await fetch(`${baseUrl}${url}`);
    const status = response.status;
    
    if (status === 200) {
      const data = await response.json();
      console.log(`✅ ${name}: ${url} - Status ${status} - Found ${data.length || 1} items`);
      return true;
    } else {
      const text = await response.text();
      console.log(`❌ ${name}: ${url} - Status ${status}`);
      console.log(`   Response: ${text.substring(0, 100)}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${name}: ${url} - Failed: ${error.message}`);
    return false;
  }
}

async function testAll() {
  console.log('\n🔍 TESTING ALL ENDPOINTS\n');
  
  const endpoints = [
    ['Health Check', '/health'],
    ['Products', '/api/products'],
    ['Categories', '/api/categories'],
    ['Hero', '/api/hero'],
    ['Settings', '/api/settings?key=stats'],
  ];

  let passed = 0;
  for (const [name, url] of endpoints) {
    if (await testEndpoint(name, url)) passed++;
    console.log('---');
  }

  console.log(`\n📊 Results: ${passed}/${endpoints.length} endpoints working`);
  
  if (passed === endpoints.length) {
    console.log('\n🎉 ALL ENDPOINTS WORKING! Your backend is correctly configured.');
  } else {
    console.log('\n❌ Some endpoints are failing. Check your backend configuration.');
  }
}

testAll();