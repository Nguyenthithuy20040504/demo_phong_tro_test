async function test() {
  const url = 'http://localhost:3000/api/phong-public';
  try {
    const response = await fetch(url);
    console.log('Status:', response.status);
    const result = await response.json();
    console.log('Success:', result.success);
    console.log('Count:', result.data?.length);
    if (result.data?.length > 0) {
      console.log('Sample:', JSON.stringify(result.data[0], null, 2));
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

test();
