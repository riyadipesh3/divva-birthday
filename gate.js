(() => {
  const form=document.querySelector('#unlock-form');
  const input=document.querySelector('#birthday-password');
  const status=document.querySelector('#password-status');
  const submit=document.querySelector('#unlock-button');
  const show=document.querySelector('#show-password');
  const motionButton=document.querySelector('#motion-toggle');
  const sessionKey='divva-birthday-key';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let partyUrl;
  let storedKey=null;
  try{storedKey=sessionStorage.getItem(sessionKey);}catch{}
  document.documentElement.dataset.motion=reduced.matches?'off':'on';
  function syncMotion(){
    const paused=document.documentElement.dataset.motion==='off';
    motionButton.textContent=reduced.matches?'Reduced motion on':paused?'▷ Resume motion':'Ⅱ Pause motion';
    motionButton.disabled=reduced.matches;
    motionButton.setAttribute('aria-pressed',String(paused));
  }
  syncMotion();
  motionButton.addEventListener('click',()=>{
    document.documentElement.dataset.motion=document.documentElement.dataset.motion==='off'?'on':'off';
    syncMotion();
  });
  reduced.addEventListener('change',event=>{document.documentElement.dataset.motion=event.matches?'off':'on';syncMotion();});
  show.addEventListener('click',()=>{
    const visible=input.type==='password';
    input.type=visible?'text':'password';
    show.textContent=visible?'Hide':'Show';
    show.setAttribute('aria-label',visible?'Hide password':'Show password');
    show.setAttribute('aria-pressed',String(visible));
  });
  const decode=value=>Uint8Array.from(atob(value),c=>c.charCodeAt(0));
  let encrypted;
  async function openInvitation(password,rememberedKey){
    if(!crypto.subtle)throw new Error('BROWSER');
    if(!encrypted){
      const response=await fetch('celebration.enc',{cache:'no-store'});
      if(!response.ok)throw new Error('NETWORK');
      encrypted=await response.json();
    }
    let key;
    if(rememberedKey)key=await crypto.subtle.importKey('raw',decode(rememberedKey),'AES-GCM',true,['decrypt']);
    else{
      const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);
      key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:decode(encrypted.salt),iterations:encrypted.iterations,hash:'SHA-256'},material,{name:'AES-GCM',length:256},true,['decrypt']);
    }
    const plaintext=await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(encrypted.iv)},key,decode(encrypted.data));
    const content=JSON.parse(new TextDecoder().decode(plaintext));
    if(typeof content.html!=='string'||typeof content.script!=='string'||typeof content.card!=='string')throw new Error('CONTENT');
    try{sessionStorage.setItem(sessionKey,btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.exportKey('raw',key)))));}catch{}
    document.querySelector('#welcome').classList.add('is-opening');
    status.textContent='A little celebration, coming right up…';
    if(!rememberedKey&&!reduced.matches)await new Promise(resolve=>setTimeout(resolve,650));
    const root=document.querySelector('#celebration-root');
    root.innerHTML=content.html;
    root.hidden=false;
    document.querySelector('#welcome').remove();
    document.body.classList.remove('is-locked');
    document.body.classList.add('party-open');
    document.title="Here's to you, Divva — from Daniel";
    const card=root.querySelector('.save-card');
    partyUrl=URL.createObjectURL(new Blob([content.card],{type:'image/svg+xml'}));
    card.href=partyUrl;
    const script=document.createElement('script');
    script.textContent=content.script;
    root.append(script);
    const title=root.querySelector('h1');
    title.setAttribute('tabindex','-1');
    title.focus({preventScroll:true});
    document.querySelector('#lock-invitation').addEventListener('click',()=>{
      try{sessionStorage.removeItem(sessionKey);}catch{}
      URL.revokeObjectURL(partyUrl);
      location.replace(location.pathname);
    });
  }
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(submit.disabled)return;
    submit.disabled=true;
    input.removeAttribute('aria-invalid');
    status.textContent='Opening your invitation…';
    try{await openInvitation(input.value,null);}catch(error){
      const incorrect=error.name==='OperationError';
      status.textContent=incorrect?"That one's not quite right. Try again.":error.message==='BROWSER'?'Please open this invitation in an up-to-date browser.':'Your invitation could not load. Check your connection and try again.';
      if(incorrect){input.setAttribute('aria-invalid','true');input.select();}
      submit.disabled=false;
      document.querySelector('.welcome-card')?.classList.remove('is-wrong');
      requestAnimationFrame(()=>document.querySelector('.welcome-card')?.classList.add('is-wrong'));
    }
  });
  if(storedKey){
    submit.disabled=true;
    status.textContent='Welcome back, Divva…';
    openInvitation(null,storedKey).catch(()=>{
      try{sessionStorage.removeItem(sessionKey);}catch{}
      status.textContent='';submit.disabled=false;
    });
  }
})();
