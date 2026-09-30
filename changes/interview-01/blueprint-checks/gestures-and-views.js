async page => {
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8879/?capture=1#table');
 // Refreshed by R3 (27/09/2026): start from a clean device (a previous run may leave English or
 // the P2 PG-20 sheet drawer open over the Table).
 await page.evaluate(()=>{localStorage.clear();sessionStorage.clear();});await page.reload();
 await page.getByRole('button',{name:'Ripristina esempio',exact:true}).click();
 await page.getByRole('button',{name:'Ripristina',exact:true}).click();
 await page.setViewportSize({width:1440,height:1000});
 const token=page.locator('[data-actor=livia]');const origin=await token.getAttribute('transform');
 let box=await token.locator('circle').first().boundingBox();let x=box.x+box.width/2,y=box.y+box.height/2;
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+110,y-30,{steps:8});
 if(await token.getAttribute('transform')!==origin)throw Error('Drag preview executed early');
 await page.keyboard.press('Escape');await page.mouse.up();
 if(await token.getAttribute('transform')!==origin)throw Error('ESC release executed cancelled drag');
 box=await token.locator('circle').first().boundingBox();x=box.x+box.width/2;y=box.y+box.height/2;
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+100,y-40,{steps:8});await page.mouse.up();
 if(await token.getAttribute('transform')===origin)throw Error('Drag did not move token');
 await page.getByRole('button',{name:'Annulla ultima modifica',exact:true}).click();
 if(await token.getAttribute('transform')!==origin)throw Error('Drag undo mismatch');
 await page.getByRole('combobox',{name:'Visita come',exact:true}).selectOption('dm');
 // Refreshed by R3 (27/09/2026): «Avvia combattimento» opens the start dialog at the Table (P5
 // roll call); typing the d20s starts nothing until «Inizia combattimento».
 await page.getByRole('button',{name:'Avvia combattimento',exact:true}).click();
 const start=page.locator('#dialog');
 await start.locator('[data-ct-start-natural]').first().waitFor();
 for(const [id,natural] of [['livia',18],['goblin-1',12],['doran',10],['goblin-2',8]]) {
  await start.locator('[data-ct-start-include="'+id+'"]').check();
  await start.locator('[data-ct-start-natural="'+id+'"]').fill(String(natural));
  await start.locator('[data-ct-start-natural="'+id+'"]').press('Tab');
 }
 if(await start.locator('[data-ct-start-include="mira"]').count())await start.locator('[data-ct-start-include="mira"]').uncheck();
 if((await page.evaluate(()=>JSON.parse(localStorage.getItem('d20-studio-blueprint-v1')))).combat.active)throw Error('Typing initiative started combat');
 await start.getByRole('button',{name:'Inizia combattimento',exact:true}).click();
 await page.locator('#battle-map').waitFor();
 await page.getByRole('combobox',{name:'Visita come',exact:true}).selectOption('player');
 await page.getByRole('combobox',{name:'Visita come',exact:true}).selectOption('player');
 box=await token.locator('circle').first().boundingBox();x=box.x+box.width/2;y=box.y+box.height/2;
 const scale=await page.locator('#battle-map').evaluate(svg=>svg.getScreenCTM().a);
 // W2b1 integration: the courtyard is no longer empty ground. B40 made the fountain water
 // (swimming costs double) and B41 hid a pressure plate (x 400-450, y 350-410) that stops
 // whoever enters it; the over-budget drag runs lower, clear of both, and still stops at 9 m.
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+500*scale,y+160*scale,{steps:12});
 if(!await page.locator('#map-message').textContent().then(s=>s.includes('oltre il movimento')))throw Error('Over-budget preview missing');
 await page.locator('#toast').waitFor({state:'hidden'});
 await page.screenshot({path:'/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/maint/table-desktop.png',fullPage:true});
 await page.mouse.up();
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('d20-studio-blueprint-v1')));
 const position=stored.scenes[0].tokens.find(t=>t.actorId==='livia');
 // Refreshed by R3 (27/09/2026), P6 TV-10: the SRD grid is the default distance (a diagonal
// square costs one square), so 9 m are 6 squares along the larger of |dx| and |dy|.
if(Math.abs(Math.max(Math.abs(position.x-250),Math.abs(position.y-380))-300)>1.5||position.x<530||stored.actors.livia.movement!==0)throw Error('Over-budget release overspent movement');
 await page.getByRole('button',{name:'Sposta vista',exact:true}).click();
 const map=page.locator('#battle-map');const beforePan=await map.getAttribute('viewBox');
 const mb=await map.boundingBox();await page.mouse.move(mb.x+mb.width/2,mb.y+mb.height/2);await page.mouse.down();await page.mouse.move(mb.x+mb.width/2+40,mb.y+mb.height/2+35,{steps:5});
 const movedPan=await map.getAttribute('viewBox');if(movedPan===beforePan)throw Error('Pan did not change view');
 await map.dispatchEvent('pointercancel');await page.mouse.move(mb.x+mb.width/2+100,mb.y+mb.height/2+100);await page.mouse.up();
 if(await map.getAttribute('viewBox')!==movedPan)throw Error('Cancelled pan continued');
 await page.getByRole('button',{name:'Centra la scena',exact:true}).click();
 await page.getByRole('button',{name:'Inventario',exact:true}).click();await page.getByRole('heading',{name:'Inventario',exact:true}).waitFor();
 await page.screenshot({path:'/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/maint/inventory-desktop.png',fullPage:true});
 // Refreshed by R3 (27/09/2026), P2 PG-20: Inventario opens the sheet as a drawer over the
 // map; it closes with Esc before the header's Preferences, then opens again in English.
 await page.keyboard.press('Escape');
 await page.locator('.sheet-overlay').waitFor({state:'hidden'}).catch(()=>{});
 if(await page.locator('.sheet-overlay [data-sheet-overlay-close], .sheet-overlay [data-close]').count()&&await page.locator('.sheet-overlay').isVisible())await page.locator('.sheet-overlay [data-sheet-overlay-close], .sheet-overlay [data-close]').first().click();
 await page.getByRole('button',{name:'Preferenze',exact:true}).click();await page.locator('[name=lang]').selectOption('en');await page.getByRole('button',{name:'Salva preferenze',exact:true}).click();
 await page.getByRole('button',{name:'Inventory',exact:true}).click();
 await page.getByRole('heading',{name:'Inventory',exact:true}).waitFor();
 await page.screenshot({path:'/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/maint/inventory-en-desktop.png',fullPage:true});
 const mobile=await page.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
 const phone=await mobile.newPage();phone.on('pageerror',e=>errors.push(e.message));await phone.goto('http://127.0.0.1:8879/');
 await phone.getByRole('button',{name:'Entra al Tavolo',exact:true}).tap();await phone.locator('#battle-map').waitFor();
 const overflow=await phone.evaluate(()=>document.documentElement.scrollWidth>innerWidth);if(overflow)throw Error('Mobile horizontal overflow');
 await phone.screenshot({path:'/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/maint/table-mobile.png',fullPage:true});
 await phone.getByRole('button',{name:'Inventario',exact:true}).tap();await phone.getByRole('heading',{name:'Inventario',exact:true}).waitFor();
 await phone.getByRole('button',{name:'Bevi',exact:true}).tap();await phone.getByRole('button',{name:'Annulla',exact:true}).tap();
 if(await phone.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Inventory mobile overflow');
 await phone.screenshot({path:'/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/maint/inventory-mobile.png',fullPage:true});
 await mobile.close();
 if(errors.length)throw Error(errors.join(';'));
 return {passed:['free drag preview','ESC release','free drag execute/undo','over-budget preview/stop','pan/cancel','EN inventory','phone touch navigation/dialog','no horizontal overflow'],errors};
}
