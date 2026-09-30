async (page) => {
 const errors=[],passed=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*.mjs',r=>r.continue());await page.reload();
 const button=name=>page.getByRole('button',{name,exact:true});
 // Wave 1 (B56): a registered roll shows animated dice first; Esc closes them before it reaches the dialog (W1b recipe).
 const __settleDice=async p=>{const layer=p.locator('[data-dice3d-layer]:not([hidden])');await layer.waitFor({timeout:1000}).catch(()=>{});for(let i=0;i<8&&(await layer.count());i++){await p.keyboard.press('Escape');await p.waitForTimeout(80);}await layer.waitFor({state:'hidden',timeout:5000});};
 const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('d20-studio-blueprint-v1')));
 const check=(v,m)=>{if(!v)throw Error(m);};
 let data=await saved();check(data.scenes.find(s=>s.id===data.activeSceneId).name==='Cortile delle due porte','Run spatial-journey first');
 check(data.actors.livia.action&&data.actors.livia.movement===9,'Fixture not reset after movement');
 await page.getByRole('combobox',{name:'Modalità dei dadi dell’azione',exact:true}).selectOption('physical');
 await button('Bastone ferrato').click();await page.locator('[data-actor="goblin-1"]').hover();
 check((await page.locator('#combat-detail').innerText()).includes('Avvicinati e attacca'),'Approach preview absent');
 const before=await saved();await page.locator('[data-actor="goblin-1"]').click();
 await page.getByRole('dialog',{name:'Tiri e risultati',exact:true}).waitFor();
 data=await saved();let attempt=data.combatAttempts.at(-1);
 check(attempt.approach.status==='awaiting-throw'&&attempt.requests.length===0&&data.actors.livia.action,'Physical approach rolled or spent action early');
 check(data.actors.livia.movement<before.actors.livia.movement,'Approach did not move');
 passed.push('hover previews approach and terrain cost','physical approach moves but leaves action unspent');
 await page.keyboard.press('Escape');await page.reload();await page.getByRole('button',{name:/^Apri richieste/}).click();
 data=await saved();check(data.combatAttempts.at(-1).approach.status==='awaiting-throw','Reload lost physical arrival');
 await button('Cambia mossa').click();data=await saved();check(data.combatAttempts.at(-1).approach.status==='cancelled'&&data.actors.livia.action,'Changing strategy consumed action');
 passed.push('arrival survives minimize and reload','change move preserves remaining action');
 await page.getByRole('combobox',{name:'Modalità dei dadi dell’azione',exact:true}).selectOption('physical');
 await button('Bastone ferrato').click();await page.locator('[data-actor="goblin-1"]').click();await button('Ho lanciato i dadi').click();
 data=await saved();check(!data.actors.livia.action&&data.combatAttempts.at(-1).requests[0].status==='pending','Actual attempt did not spend action');
 await button('Risolvi tiro').click();await page.locator('[name=face0]').fill('1');await button('Registra tiro').click();await __settleDice(page);
 data=await saved();check(data.combatAttempts.at(-1).status==='resolved','Physical miss unresolved');
 await page.keyboard.press('Escape');await button('Annulla ultima modifica').click();data=await saved();check(data.combatAttempts.at(-1).requests[0].status==='pending'&&!data.actors.livia.action,'Undo result should preserve attempt');
 await button('Annulla ultima modifica').click();data=await saved();check(data.actors.livia.action,'Undo attempt did not restore action');
 passed.push('actual throw consumes once with physical breakdown','undo distinguishes result and attempt');
 // An adjacent digital attack still resolves using the accepted controller.
 await page.getByRole('combobox',{name:'Modalità dei dadi dell’azione',exact:true}).selectOption('digital');await button('Bastone ferrato').click();await page.locator('[data-actor="goblin-1"]').click();data=await saved();check(!data.actors.livia.action&&data.combatAttempts.at(-1).mode==='digital','Digital attack did not execute');
 passed.push('digital attack executes after approach change');
 await page.waitForFunction(()=>!document.querySelector('#toast').classList.contains('shown'));
 await page.screenshot({path:'/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-23/approach-resolved.png',fullPage:true});
 check(errors.length===0,errors.join(';'));return{passed,errors};
}
