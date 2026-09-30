async page => {
 // P6 DM at the Table: right-click «Aggiungi creatura qui» adds a goblin in 3 interactions
 // (TV-21), the bestiary drawer drags one onto the map, the palette finds it by «pedina»,
 // «Scene» opens the scene list over the map (TV-106), a far door is walked to and opened
 // (TV-04), and right-click opens the menu on a selected token every time (X-03).
 const shots='/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-26/fix-P6/';
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:1440,height:900});
 await page.goto('http://127.0.0.1:8879/#table');await page.reload();
 await page.getByRole('button',{name:'Ripristina esempio',exact:true}).click();
 await page.getByRole('button',{name:'Ripristina',exact:true}).click();
 await page.getByRole('combobox',{name:'Visita come',exact:true}).selectOption('dm');
 const map=page.locator('#battle-map');await map.waitFor();
 const stored=async()=>page.evaluate(()=>JSON.parse(localStorage.getItem('d20-studio-blueprint-v1')));
 const toScreen=async(p)=>map.evaluate((svg,p)=>{const m=svg.getScreenCTM();return {x:m.a*p.x+m.e,y:m.d*p.y+m.f};},p);
 const passed=[];
 // 1. Right-click the empty map (1) › «Aggiungi creatura qui…» (2) › «Goblin guerriero» (3).
 const count0=(await stored()).scenes[0].tokens.length;
 const spot=await toScreen({x:450,y:180});
 await page.mouse.click(spot.x,spot.y,{button:'right'});
 await page.getByRole('menuitem',{name:'Aggiungi creatura qui…'}).click();
 await page.locator('#token-menu-creature-search').fill('goblin');
 await page.screenshot({path:shots+'d01-add-creature-menu.png'});
 await page.getByRole('menuitem',{name:/Goblin guerriero/}).click();
 await page.waitForTimeout(300);
 let s=await stored();const scene=s.scenes.find(x=>x.id===s.activeSceneId);
 if(scene.tokens.length!==count0+1)throw Error('No goblin was added');
 const added=scene.tokens.at(-1);
 if(Math.hypot(added.x-450,added.y-180)>2)throw Error('Goblin not where right-clicked: '+JSON.stringify(added));
 if(!/Goblin guerriero/.test(s.actors[added.actorId].name))throw Error('Wrong creature: '+s.actors[added.actorId].name);
 await page.screenshot({path:shots+'d02-goblin-added.png'});
 passed.push('right-click add goblin in 3 interactions');
 await page.keyboard.press('Control+z');
 // 2. The palette finds the command by «pedina».
 await page.keyboard.press('Control+k');
 await page.keyboard.type('pedina');
 await page.waitForTimeout(250);
 const found=await page.getByRole('option',{name:/Aggiungi creatura: una nuova pedina/}).count();
 await page.screenshot({path:shots+'d03-palette-pedina.png'});
 if(!found)throw Error('Palette does not find «Aggiungi creatura» by «pedina»');
 await page.getByRole('option',{name:/Aggiungi creatura: una nuova pedina/}).first().click();
 await page.locator('[data-token-menu-drawer-search]').waitFor();
 passed.push('palette «pedina» opens the bestiary');
 // 3. Drag from the drawer onto the map.
 await page.locator('[data-token-menu-drawer-search]').fill('lupo');
 const row=page.locator('[data-token-menu-drag]').first();
 const target=await toScreen({x:520,y:420});
 const before=(await stored()).scenes[0].tokens.length;
 await row.dragTo(map,{targetPosition:{x:target.x-(await map.boundingBox()).x,y:target.y-(await map.boundingBox()).y}});
 await page.waitForTimeout(300);
 s=await stored();
 if(s.scenes[0].tokens.length!==before+1)throw Error('Drag from the drawer added nothing');
 passed.push('drawer drag to the map');
 // 4. «Scene» opens the list over the map; «Attiva per il gruppo» and «Apri per me».
 await page.getByRole('button',{name:'Scene',exact:true}).click();
 await page.getByRole('button',{name:/Attiva per il gruppo/}).first().waitFor();
 if(!await page.locator('#battle-map').count())throw Error('Scene button left the Table');
 await page.screenshot({path:shots+'d04-scene-navigator.png'});
 await page.keyboard.press('Escape');
 passed.push('scene navigator over the map');
 // 5. Right-click on a selected token opens its menu every time (X-03).
 const doranAt=await toScreen(s.scenes[0].tokens.find(t=>t.actorId==='doran'));
 await page.mouse.click(doranAt.x,doranAt.y);
 let misses=0;
 for(let i=0;i<8;i++){
  await page.mouse.click(doranAt.x,doranAt.y,{button:'right'});
  const open=await page.locator('body > .token-menu:not([hidden])').count();
  if(!open)misses++;
  await page.keyboard.press('Escape');
  await page.waitForTimeout(60);
 }
 if(misses)throw Error('Right-click missed '+misses+' of 8');
 passed.push('right-click menu 8 of 8');
 // 6. A far door: walk there and open it after a confirm, with the cost shown.
 await page.getByRole('combobox',{name:'Visita come',exact:true}).selectOption('player');
 const doorAt=await toScreen({x:340,y:140});
 await page.mouse.click(doorAt.x,doorAt.y);
 const dialog=page.locator('#dialog');await dialog.waitFor();
 const text=await dialog.innerText();
 await page.screenshot({path:shots+'d05-far-door.png'});
 if(!/cammina fino alla porta/.test(text))throw Error('The far door does not offer the walk: '+text);
 if(/Aprire il dettaglio non cambia/.test(text))throw Error('Jargon sentence still there');
 await page.getByRole('button',{name:/Vai e apri con Livia/}).click();
 await page.waitForTimeout(300);
 s=await stored();
 const door=s.scenes[0].walls.find(w=>w.id==='sm-north-room-door');
 if(door.doorState!=='open')throw Error('Door not opened after the walk');
 passed.push('far door: walk and open');
 if(errors.length)throw Error(errors.join(';'));
 return {passed};
}
