async function testFetch() {
  try {
    const res = await fetch("http://localhost:3000/api/test-hop-dong-public");
    const text = await res.text();
    console.log(text);
  } catch(e) {
    console.error(e);
  }
}
testFetch();
