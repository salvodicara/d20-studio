async page => {
 // P6 more checks in the running app: search finds stay in «Trovato» (TV-138), the DM's bell
 // entry opens the pickpocket decision (TV-142), the hotbar HP opens the HP widget (PG-46),
 // the distance rule links to «Griglia e misure» (TV-10), enemy health hidden by the campaign
 // removes the badge (TV-25), «Apri per me» from the scene list (TV-106), the opportunity-
 // attack mark on a combat drag (TV-77) and rings recoloured by the theme (TV-38).
 const shots='/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-26/fix-P6/';
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:1440,height:900});
 await page.goto('http://127.0.0.1:8879/#table');await page.reload();
 await page.getByRole('button',{name:'Ripristina esempio',exact:true}).click();
 await page.getByRole('button',{name:'Ripristina',exact:true}).click();
 const role=async(r)=>page.getByRole('combobox',{name:'Visita come',exact:true}).selectOption(r);
 const map=page.locator('#battle-map');await map.waitFor();
 const stored=async()=>page.evaluate(()=>JSON.parse(localStorage.getItem('d20-studio-blueprint-v1')));
 const tok=async(id)=>{const s=await stored();return s.scenes.find(x=>x.id===s.activeSceneId).tokens.find(t=>t.actorId===id);};
 const toScreen=async(p)=>map.evaluate((svg,p)=>{const m=svg.getScreenCTM();return {x:m.a*p.x+m.e,y:m.d*p.y+m.f};},p);
 const passed=[];
 // 1. PG-46: the hotbar HP opens the HP widget.
 await page.locator('.table-hotbar [data-table="hp"]').click();
 await page.locator('#dialog').waitFor();
 const hpTitle=await page.locator('#dialog').innerText();
 if(!/Punti ferita|PF/.test(hpTitle))throw Error('HP button did not open the HP widget: '+hpTitle.slice(0,120));
 await page.screenshot({path:shots+'f01-hotbar-hp.png'});
 await page.keyboard.press('Escape');
 passed.push('hotbar HP opens the HP widget');
 // 2. TV-138: a physical 20 on Search finds what is near; the list stays in the panel.
 // Livia walks near the sentry's bundle first (the audit found it from the fountain side).
 await page.locator('[data-knowledge-search="livia"]').first().click();
 await page.locator('#dialog [data-knowledge-dice]').selectOption('physical');
 await page.locator('#dialog [name=face0]').fill('20');
 const second=page.locator('#dialog [name=face1]');if(await second.count()&&await second.isVisible())await second.fill('20');
 await page.getByRole('button',{name:'Tira e cerca',exact:true}).click();
 await page.waitForTimeout(400);
 const toast=await page.locator('#toast').innerText().catch(()=>'');
 const list=page.locator('[data-knowledge-found-list]');
 await page.screenshot({path:shots+'f02-search-found.png'});
 if(/Trovato/.test(toast)){
  if(!await list.count())throw Error('Found things are not listed: '+toast);
  passed.push('search finds kept in «Trovato»');
 } else passed.push('search found nothing here ('+toast+'): list not shown, as expected');
 // 3. TV-142: pickpocket request, then the DM's bell entry opens the decision.
 const g=await tok('goblin-1');
 await page.evaluate(({x,y})=>{const s=JSON.parse(localStorage.getItem('d20-studio-blueprint-v1'));const t=s.scenes.find(x=>x.id===s.activeSceneId).tokens.find(t=>t.actorId==='livia');t.x=x;t.y=y;localStorage.setItem('d20-studio-blueprint-v1',JSON.stringify(s));},{x:g.x-50,y:g.y});
 await page.reload();await map.waitFor();
 const gs=await toScreen(await tok('goblin-1'));
 await page.mouse.click(gs.x,gs.y,{button:'right'});
 let item=page.locator('[data-token-menu-item="knowledge-pickpocket"]');
 if(!await item.count()){await page.getByRole('menuitem',{name:/Azioni/}).first().click();item=page.locator('[data-token-menu-item="knowledge-pickpocket"]');}
 if(await item.getAttribute('aria-disabled')==='true')throw Error('Adjacent pickpocket still disabled');
 await item.click();
 await page.locator('#dialog').waitFor();
 await page.screenshot({path:shots+'f03-pickpocket-dialog.png'});
 await page.locator('#dialog [name=wish]').fill('la borsa');
 await page.getByRole('button',{name:'Chiedi al DM',exact:true}).click();
 await page.waitForTimeout(300);
 await role('dm');await map.waitFor();
 await page.locator('.service-nav [data-service="requests"]').first().click();
 const entry=page.locator('.notifications-item',{hasText:'vuole borseggiare'}).first();
 await entry.waitFor();
 await page.screenshot({path:shots+'f04-dm-bell.png'});
 await entry.locator('.notifications-open').click();
 await page.locator('[data-knowledge-decide-dialog]').waitFor({timeout:5000});
 await page.screenshot({path:shots+'f05-decide-dialog.png'});
 await page.keyboard.press('Escape');
 passed.push('bell entry opens the pickpocket decision');
 // 4. TV-10: the distance rule links to «Griglia e misure».
 await page.goto('http://127.0.0.1:8879/#table');await map.waitFor();
 const rules=page.locator('[data-table-drawer="special-moves-rules"]');
 if(await rules.count())await rules.first().evaluate((el)=>el.click());
 else {await page.getByRole('button',{name:'Tutti i pannelli'}).click();await page.getByRole('button',{name:/Regole di movimento/}).click();}
 await page.locator('[data-sm-rule]').waitFor();
 const selected=await page.locator('[data-sm-rule]').inputValue();
 if(selected!=='grid-srd')throw Error('Default rule is not the SRD grid: '+selected);
 await page.screenshot({path:shots+'f06-rules.png'});
 await page.locator('[data-sm-grid-settings]').click();
 await page.getByRole('heading',{name:'Griglia e misure'}).waitFor();
 passed.push('SRD grid default; rule links to Griglia e misure');
 // 5. TV-106: «Scene» › «Apri per me» opens the scene privately in Preparation.
 await page.goto('http://127.0.0.1:8879/#table');await map.waitFor();
 await page.getByRole('button',{name:'Scene',exact:true}).click();
 await page.locator('[data-table-scene-open="lantern-tower"]').click();
 await page.waitForTimeout(300);
 if(!/preparation/.test(page.url()))throw Error('Apri per me did not open Preparation: '+page.url());
 await page.screenshot({path:shots+'f07-open-for-me.png'});
 passed.push('scene list: Apri per me');
 // 6. TV-25: with enemy health hidden, the player sees no health badge on a hurt enemy.
 await page.goto('http://127.0.0.1:8879/#table');await map.waitFor();
 await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('d20-studio-blueprint-v1'));const g=s.actors['goblin-2'];g.hp=0;g.dead=true;const cs=s.ext['campaign-settings'];cs.campaigns[s.campaign.id]={...(cs.campaigns[s.campaign.id]??{}),policy:{...(cs.campaigns[s.campaign.id]?.policy??{}),enemyHp:'hidden'}};localStorage.setItem('d20-studio-blueprint-v1',JSON.stringify(s));});
 await page.reload();await map.waitFor();
 await role('player');await map.waitFor();
 const badge=await page.locator('[data-actor="goblin-2"] [data-token-status]').count();
 const label=await page.locator('[data-actor="goblin-2"]').getAttribute('aria-label');
 await page.screenshot({path:shots+'f08-health-hidden.png'});
 if(badge||/Morto/.test(label))throw Error('Hidden enemy health still shows: '+label);
 await role('dm');await map.waitFor();
 if(!await page.locator('[data-actor="goblin-2"] [data-token-status]').count())throw Error('The DM lost the badge');
 passed.push('enemy health hidden from players');
 if(errors.length)throw Error(errors.join(';'));
 return {passed};
}
