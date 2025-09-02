const chat = document.getElementById('chat');
const box = document.getElementById('box');
const send = document.getElementById('send');

function add(role, text){
  const d = document.createElement('div');
  d.className = 'msg';
  d.innerHTML = `<span class="role ${role}">${role}:</span> ${text}`;
  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;
}

let INDEX = null, llm = null, embedder = null;

(async function boot(){
  add('assistant', 'Loading index…');
  INDEX = await fetch('embeddings.json').then(r => r.json());

  add('assistant', 'Loading models (first time may take a while)…');
  embedder = await window.transformers.pipeline(
    'feature-extraction','Xenova/all-MiniLM-L6-v2'
  );
  llm = await webllm.createEngine({ model: "Llama-3.2-1B-Instruct-q4f32_1-MLC" });

  add('assistant', '✅ Ready! Ask me about your document.');
})();

function cosine(a,b){ let s=0; for (let i=0;i<a.length;i++) s+=a[i]*b[i]; return s; }

async function embed(text) {
  const out = await embedder(text, { pooling:'mean', normalize:true });
  return Array.from(out.data);
}

function topK(qVec, k=4){
  return INDEX.chunks
    .map(c => ({ c, score: cosine(qVec, c.vector) }))
    .sort((a,b)=>b.score-a.score)
    .slice(0,k)
    .map(x=>x.c);
}

function buildContext(passages){
  return passages.map((c,i)=>`[${i+1}] ${c.extract}`).join('\n');
}

async function askLLM(engine, passages, q){
  const context = buildContext(passages);
  const system = "Answer ONLY using CONTEXT. If missing, say you don't have enough information. Keep it concise. Cite [1]/[2].";
  const user = `CONTEXT:\n${context}\n\nQUESTION: ${q}\nANSWER:`;
  const out = await engine.chat.completions.create({
    messages:[{role:'system',content:system},{role:'user',content:user}],
    temperature:0.2, max_tokens:200
  });
  return out.choices?.[0]?.message?.content || "No reply.";
}

async function submit(){
  const q = box.value.trim();
  if (!q || !INDEX || !llm || !embedder) return;
  box.value = ''; add('user', q); send.disabled = true;
  try {
    const qVec = await embed(q);
    const passages = topK(qVec,4);
    const reply = await askLLM(llm, passages, q);
    add('assistant', reply + `\n\n— Sources: ` + passages.map((c,i)=>`[${i+1}] ${c.title}`).join(' • '));
  } catch(e){ add('assistant','Error: '+e.message); }
  finally { send.disabled = false; }
}

send.onclick = submit;
box.addEventListener('keydown', e => {
  if (e.key==='Enter' && !e.shiftKey){ e.preventDefault(); submit(); }
});