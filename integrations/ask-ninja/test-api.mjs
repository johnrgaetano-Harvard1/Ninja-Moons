import assert from 'node:assert/strict';
process.env.NINJA_AI_ENABLED='true';process.env.NINJA_TEST_ACCESS_CODE='test-secret-not-used-in-production';process.env.VERCEL_OIDC_TOKEN='fake-provider-token';
const {GET,POST}=await import('./api/ask.mjs');
const base='https://example.test/api/ask';
const get=GET(new Request(base));assert.equal((await get.json()).requiresCode,false);const cookie=get.headers.get('set-cookie').split(';')[0];assert.match(cookie,/nm_ai_session=/);
function req(body,opts={}){return new Request(base,{method:'POST',headers:{'content-type':'application/json',origin:'https://example.test',cookie,...opts},body:JSON.stringify(body)});}
assert.equal((await POST(req({question:'Hello',story:''},{cookie:''}))).status,401);
assert.equal((await POST(req({question:'Hello',story:''},{origin:'https://other.test'}))).status,403);
assert.equal((await POST(req({question:'x'.repeat(401),story:''}))).status,400);
let calls=0;globalThis.fetch=async(url,options)=>{calls++;assert.match(url,/ai-gateway/);assert.equal(JSON.parse(options.body).model,'openai/gpt-5-nano');return Response.json({choices:[{message:{content:'A spaceship carries people or equipment through space.'}}]});};
const answer=await POST(req({question:'What is a spaceship?',story:'The spaceship traveled among the stars.'}));assert.equal(answer.status,200);assert.match((await answer.json()).answer,/spaceship/);assert.equal(calls,1);
for(let i=0;i<19;i++)await POST(req({question:'A word?',story:''}));assert.equal((await POST(req({question:'One more?',story:''}))).status,429);
console.log('API checks passed: automatic signed session, origin protection, question bounds, real provider request path, and rate limiting.');
