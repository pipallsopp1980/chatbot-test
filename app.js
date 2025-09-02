const chat = document.getElementById('chat');
const box = document.getElementById('box');
const send = document.getElementById('send');
const answerBtn = document.getElementById('answerBtn');
const searchBtn = document.getElementById('searchBtn');
const proToggle = document.getElementById('proToggle');

function add(role, text){
  const d = document.createElement('div');
  d.className = 'msg';
  d.innerHTML = `<span class="role ${role}">${role}:</span> ${text}`;
  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;
}

let INDEX = null, embedder = null;
let llmLite = null, llmPro = null, currentLLM = null;

(async function boot(){
  add('assistant', 'Loading embeddings index…');
  INDEX = await fetch('embeddings.json').then(r => r.json());
  add('assistant', 'Loading query embedder…');
  embedder = await window.transformers.pipeline('feature-extraction','Xenova/all-MiniLM-L6-v2');
  add('assistant', 'Ready. Use “Search-only” for instant results, or “Answer” to load the model.');
})();

function cosine(a,b){ let s=0; for (let i=0;i<a.length;i++) s+=a[i]*b[i]; return s; }
async function embed(text){ const out = await embedder(text, { pooling:'mean', normalize:true }); return Array.from(out.data); }

function topK(qVec, k=6){
  return INDEX.chunks
    .map(c => ({ c, score: cosine(qVec, c.vector) }))
    .sort((a,b)=>b.score-a.score)
    .slice(0,k)
    .map(x=>x.c);
}

function renderSources(passages){
  return '— Sources: ' + passages.slice(0,4).map((c,i)=>`[${i+1}] ${c.title ?? ('Section ' + (i+1))}`).join(' · ');
}

async function ensureLLM(){
  if (currentLLM) return currentLLM;
  add('assistant', proToggle.checked ? 'Loading 3B model (slower)…' : 'Loading 1B model…');
  if (proToggle.checked){
    if (!llmPro) llmPro = await webllm.createEngine({ model: "Llama-3.2-3B-Instruct-q4f32_1-MLC" });
    currentLLM = llmPro;
  } else {
    if (!llmLite) llmLite = await webllm.createEngine({ model: "Llama-3.2-1B-Instruct-q4f32_1-MLC" });
    currentLLM = llmLite;
  }
  add('assistant', 'Model ready.');
  return currentLLM;
}

function buildContext(passages){
  return passages.slice(0,4).map((c,i)=>`[${i+1}] ${c.extract}`).join('\n');
}

async function askLLM(engine, passages, q){
  const system = "Answer ONLY using CONTEXT. If missing, say you don't have enough information. Keep it concise. Include citations like [1], [2].";
  const user = `CONTEXT:\n${buildContext(passages)}\n\nQUESTION: ${q}\n\nANSWER:`;
  const out = await engine.chat.completions.create({
    messages:[{role:"system",content:system},{role:"user",content:user}],
    temperature:0.2, max_tokens:200
  });
  return out.choices?.[0]?.message?.content || "No reply.";
}

// --- UI actions ---
async function searchOnly(){
  const q = box.value.trim(); if(!q || !INDEX || !embedder) return;
  box.value = ''; add('user', q); send.disabled = true; searchBtn.disabled = true;
  try {
    const qVec = await embed(q);
    const passages = topK(qVec, 6);
    const snippet = passages.slice(0,3).map((c,i)=>`[${i+1}] ${c.extract}`).join('\n\n');
    add('assistant', snippet + '\n\n' + renderSources(passages.slice(0,3)));
  } catch(e){ add('assistant','Error: ' + e.message); }
  finally { send.disabled = false; searchBtn.disabled = false; }
}

async function fullAnswer(){
  const q = box.value.trim(); if(!q || !INDEX || !embedder) return;
  box.value = ''; add('user', q); send.disabled = true; answerBtn.disabled = true;
  try {
    const qVec = await embed(q);
    const passages = topK(qVec, 6);
    const engine = await ensureLLM();        // load model only now
    const reply = await askLLM(engine, passages, q);
    add('assistant', reply + '\n\n' + renderSources(passages.slice(0,4)));
  } catch(e){ add('assistant','Error: ' + e.message); }
  finally { send.disabled = false; answerBtn.disabled = false; }
}

send.onclick = fullAnswer;          // Enter key triggers full answer
answerBtn.onclick = fullAnswer;     // Explicit “Answer”
searchBtn.onclick = searchOnly;     // Instant “Search-only”
box.addEventListener('keydown', e => { if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); fullAnswer(); }});
