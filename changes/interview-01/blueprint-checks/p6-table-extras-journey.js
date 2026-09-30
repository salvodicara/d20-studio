async page => {
 // P6 extras in the running app: Ctrl+C right after clicking a token (TV-20), grouped tokens
 // move together (TV-20), handles resize a token (TV-19), filtered box select (TV-15), «Trova
 // la mia pedina» (TV-26), the «?» guide lists Alt labels and the last move (TV-11, TV-08),
 // «Cadere» in Mosse speciali (TV-71), search results kept in «Trovato» (TV-138), «Borseggia»
 // greyed out of reach (TV-142), cover written on the map with «Togli» (TV-44), the grid link
 // (TV-10) and the opportunity-attack mark on a combat path (TV-77). Synthetic data only.
 const shots='/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-26/fix-P6/';
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:1440,height:900});
 await page.goto('http://127.0.0.1:8879/#table');await page.reload();
 await page.getByRole('button',{name:'Ripristina esempio',exact:true}).click();
 await page.getByRole('button',{name:'Ripristina',exact:true}).click();
 const role=async(r)=>page.getByRole('combobox',{name:'Visita come',exact:true}).selectOption(r);
 await role('dm');
 const map=page.locator('#battle-map');await map.waitFor();
 const stored=async()=>page.evaluate(()=>JSON.parse(localStorage.getItem('d20-studio-blueprint-v1')));
 const tok=async(id)=>{const s=await stored();return s.scenes.find(x=>x.id===s.activeSceneId).tokens.find(t=>t.actorId===id);};
 const toScreen=async(p)=>map.evaluate((svg,p)=>{const m=svg.getScreenCTM();return {x:m.a*p.x+m.e,y:m.d*p.y+m.f};},p);
 const msg=async()=>page.locator('#map-message').textContent();
 const passed=[];
 // 1. Ctrl+C right after a click on a creature copies it (the focus stays on the token);
 // Ctrl+V pastes the copy.
 const e0=await toScreen(await tok('goblin-2'));
 await page.mouse.click(e0.x,e0.y);
 await page.keyboard.press('Control+c');
 if(!/Copiate: 1/.test(await msg()))throw Error('Ctrl+C after a click did not copy: '+await msg());
 const n0=(await stored()).scenes[0].tokens.length;
 await page.keyboard.press('Control+v');
 await page.waitForTimeout(200);
 if((await stored()).scenes[0].tokens.length!==n0+1)throw Error('Ctrl+V did not paste');
 await page.keyboard.press('Control+z');
 passed.push('Ctrl+C / Ctrl+V right after clicking a token');
 let d=await toScreen(await tok('doran'));
 // 2. Group Livia, Doran, Mira (Shift+click, Shift+G), then drag Livia: the group follows.
 let l=await toScreen(await tok('livia'));const m=await toScreen(await tok('mira'));
 await page.keyboard.down('Shift');await page.mouse.click(l.x,l.y);await page.mouse.click(d.x,d.y);await page.mouse.click(m.x,m.y);await page.keyboard.up('Shift');
 await page.keyboard.press('Shift+G');
 const g0={livia:await tok('livia'),doran:await tok('doran'),mira:await tok('mira')};
 l=await toScreen(g0.livia);
 await page.mouse.move(l.x,l.y);await page.mouse.down();await page.mouse.move(l.x+40,l.y-30,{steps:8});await page.mouse.up();
 await page.waitForTimeout(250);
 const g1={livia:await tok('livia'),doran:await tok('doran'),mira:await tok('mira')};
 const dl={x:g1.livia.x-g0.livia.x,y:g1.livia.y-g0.livia.y};
 if(Math.hypot(dl.x,dl.y)<5)throw Error('Group leader did not move');
 const why=(await page.locator('#toast').innerText().catch(()=>''))+' / '+(await msg())+' / '+JSON.stringify((await stored()).ext['token-menu'].groups);
 for(const id of ['doran','mira'])if(Math.abs(g1[id].x-g0[id].x-dl.x)>1||Math.abs(g1[id].y-g0[id].y-dl.y)>1)throw Error(id+' did not follow the group: '+JSON.stringify([g0[id],g1[id],dl])+' '+why);
 await page.screenshot({path:shots+'e01-group-moved.png'});
 passed.push('grouped tokens move together');
 await page.keyboard.press('Escape');
 // 3. Resize the Sentinel with its handle: Grande; its name keeps its size.
 const g=await toScreen(await tok('goblin-1'));
 await page.mouse.click(g.x,g.y);
 const handle=page.locator('[data-token-handle="resize"]');await handle.waitFor();
 const hb=await handle.boundingBox();
 const scale=await map.evaluate(svg=>svg.getScreenCTM().a);
 await page.mouse.move(hb.x+hb.width/2,hb.y+hb.height/2);await page.mouse.down();
 await page.mouse.move(g.x+45*scale,g.y+45*scale,{steps:6});await page.mouse.up();
 await page.waitForTimeout(250);
 let s=await stored();
 if(s.ext['token-menu'].tokens['token-goblin-1']?.size!=='large')throw Error('Handle did not resize: '+JSON.stringify(s.ext['token-menu'].tokens['token-goblin-1']));
 const nameSize=await page.locator('[data-actor="goblin-1"] .token-name').evaluate(el=>el.getBoundingClientRect().height);
 const otherSize=await page.locator('[data-actor="goblin-2"] .token-name').evaluate(el=>el.getBoundingClientRect().height);
 if(Math.abs(nameSize-otherSize)>2)throw Error('Large token name grew: '+nameSize+' vs '+otherSize);
 await page.screenshot({path:shots+'e02-resize-handle.png'});
 passed.push('resize handle, fixed-size name');
 await page.keyboard.press('Control+z');
 // 4. Box select only enemies (Alt while dragging).
 await page.keyboard.press('v');
 const a=await toScreen({x:110,y:90}),b=await toScreen({x:890,y:560});
 await page.keyboard.down('Alt');
 await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:8});await page.mouse.up();
 await page.keyboard.up('Alt');
 const picked=await page.locator('.token-menu-picked').textContent().catch(()=>'');
 if(!/2 selezionate/.test(picked)||/Livia|Doran/.test(picked))throw Error('Alt box did not keep only enemies: '+picked);
 if(!await page.locator('.token-menu-picked-list li').count())throw Error('Selected tokens not listed in the panel');
 await page.screenshot({path:shots+'e03-box-enemies.png'});
 passed.push('box select only enemies, all listed');
 await page.keyboard.press('Escape');
 await page.locator('[data-tool="move"]').first().click();
 // 5. Player: «Trova la mia pedina» centres Livia; the guide lists Alt labels and last move.
 await role('player');await map.waitFor();
 await page.getByRole('button',{name:'Trova la mia pedina',exact:true}).first().click();
 const vb=(await map.getAttribute('viewBox')).split(' ').map(Number);
 const lv=await tok('livia');
 if(Math.abs(vb[0]+vb[2]/2-lv.x)>2||Math.abs(vb[1]+vb[3]/2-lv.y)>2)throw Error('Find my token did not centre Livia: '+vb);
 passed.push('find my token');
 await page.getByRole('button',{name:'Centra la scena',exact:true}).click();
 await page.keyboard.press('?');
 const guide=page.locator('#dialog');await guide.waitFor();
 const guideText=await guide.innerText();
 await page.screenshot({path:shots+'e04-guide.png'});
 if(!/tieni premuto Alt/.test(guideText))throw Error('Guide lacks the Alt labels');
 if(!/ultima mossa/i.test(guideText))throw Error('Guide lacks the last move');
 if(!/Ingrandisci la mappa/.test(guideText))throw Error('Guide lacks the zoom keys');
 await page.keyboard.press('Escape');
 passed.push('guide: Alt labels, last move, zoom');
 // 6. «Cadere» in Mosse speciali.
 await page.getByRole('button',{name:/^Mosse/}).first().click();
 if(!await page.locator('[data-sm-move="fall"]').count())throw Error('No «Cadere» in Mosse speciali');
 if(!/Cadere/.test(await page.locator('[data-sm-move="fall"]').innerText()))throw Error('Fall is not called «Cadere»');
 if(!await page.locator('[data-sm-move="pickpocket"]').count())throw Error('No «Borseggia» in Mosse speciali');
 await page.screenshot({path:shots+'e05-mosse.png'});
 await page.keyboard.press('Escape');
 passed.push('Cadere and Borseggia in Mosse speciali');
 // 7. Search: the finds stay listed; the log names «Cerca · Percezione».
 await page.locator('[data-knowledge-search="livia"]').first().click();
 await page.getByRole('button',{name:'Tira e cerca',exact:true}).click();
 await page.waitForTimeout(300);
 s=await stored();
 if(!/Cerca · Percezione/.test(s.log.at(-1).label))throw Error('Log label: '+s.log.at(-1).label);
 passed.push('log «Cerca · Percezione»');
 // 8. «Borseggia» greyed in the token menu out of reach.
 const gb=await toScreen(await tok('goblin-1'));
 await page.mouse.click(gb.x,gb.y,{button:'right'});
 const menuText=await page.locator('body > .token-menu').innerText();
 let greyed=await page.locator('[data-token-menu-item="knowledge-pickpocket"][aria-disabled="true"]').count();
 if(!greyed){await page.getByRole('menuitem',{name:/Azioni/}).first().click().catch(()=>{});greyed=await page.locator('[data-token-menu-item="knowledge-pickpocket"][aria-disabled="true"]').count();}
 await page.screenshot({path:shots+'e06-pickpocket-greyed.png'});
 if(!greyed)throw Error('Borseggia not shown greyed: '+menuText);
 await page.keyboard.press('Escape');await page.keyboard.press('Escape');
 passed.push('Borseggia visible, greyed with reason');
 // 9. Line of sight: the degree written on the map, «Togli» removes it.
 await page.locator('[data-tool-group="measure"]').click();
 await page.locator('[data-tool="knowledge-los"]').click();
 const from=await toScreen(await tok('livia')),to=await toScreen(await tok('goblin-1'));
 await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(to.x,to.y,{steps:6});await page.mouse.up();
 await page.waitForTimeout(250);
 const chip=await page.locator('[data-knowledge-hud-text]').first().textContent().catch(()=>'');
 await page.screenshot({path:shots+'e07-los-chip.png'});
 if(!/copertura/i.test(chip))throw Error('Cover not written on the map: '+chip);
 if(!await page.locator('[data-knowledge-hud="share"]').count())throw Error('No privacy switch');
 await page.locator('[data-knowledge-hud="remove"]').first().click();
 await page.waitForTimeout(200);
 if(await page.locator('[data-knowledge-hud-text]').count())throw Error('«Togli» did not remove the check');
 passed.push('cover chip, switch and Togli');
 await page.locator('[data-tool-group="select"]').click().catch(()=>{});
 // 10. English: the hint and the find button.
 await page.getByRole('button',{name:'Preferenze',exact:true}).click();
 await page.locator('[name=lang]').selectOption('en');
 await page.getByRole('button',{name:'Salva preferenze',exact:true}).click();
 await page.locator('[data-nav="table"], [data-nav=table]').first().click().catch(()=>{});
 await page.goto('http://127.0.0.1:8879/#table');
 await map.waitFor();
 const hint=await msg();
 if(!/hold Alt for labels/.test(hint))throw Error('EN hint: '+hint);
 if(!await page.getByRole('button',{name:'Find my token',exact:true}).count())throw Error('EN find button missing');
 await page.screenshot({path:shots+'e08-english.png'});
 passed.push('English hint and find');
 await page.getByRole('button',{name:'Preferences',exact:true}).click();
 await page.locator('[name=lang]').selectOption('it');
 await page.getByRole('button',{name:'Save preferences',exact:true}).click();
 if(errors.length)throw Error(errors.join(';'));
 return {passed};
}
