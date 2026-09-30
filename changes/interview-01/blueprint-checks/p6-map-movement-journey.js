async page => {
 // P6 (TV-01, TV-05, TV-27): walls block walking, empty-map drag pans, empty-map click moves
 // nobody, wheel zoom at the cursor, keyboard move keeps the focus. Synthetic demo data only.
 const shots='/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-26/fix-P6/';
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize({width:1440,height:900});
 await page.goto('http://127.0.0.1:8879/#table');await page.reload();
 await page.getByRole('button',{name:'Ripristina esempio',exact:true}).click();
 await page.getByRole('button',{name:'Ripristina',exact:true}).click();
 const map=page.locator('#battle-map');await map.waitFor();
 const stored=async()=>page.evaluate(()=>JSON.parse(localStorage.getItem('d20-studio-blueprint-v1')));
 const pos=async(id)=>{const s=await stored();return s.scenes.find(x=>x.id===s.activeSceneId).tokens.find(t=>t.actorId===id);};
 const toScreen=async(p)=>map.evaluate((svg,p)=>{const m=svg.getScreenCTM();return {x:m.a*p.x+m.e,y:m.d*p.y+m.f};},p);
 const passed=[];
 // 1. Livia dragged through the west curtain wall: refused, she stays.
 const livia0=await pos('livia');
 let a=await toScreen(livia0),b=await toScreen({x:50,y:livia0.y});
 await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:10});
 const blockedMsg=await page.locator('#map-message').textContent();
 await page.screenshot({path:shots+'j01-drag-through-wall.png'});
 await page.mouse.up();
 let livia=await pos('livia');
 if(livia.x!==livia0.x||livia.y!==livia0.y)throw Error('Livia crossed the curtain wall: '+JSON.stringify(livia));
 if(!/passaggio a piedi|bloccato|percorribile/i.test(blockedMsg))throw Error('No blocked reason: '+blockedMsg);
 passed.push('wall blocks drag (exploration)');
 // 2. Into the north room: through its closed door? No; the route is refused too.
 b=await toScreen({x:200,y:140});
 await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:10});await page.mouse.up();
 livia=await pos('livia');
 if(livia.y<200)throw Error('Livia walked into the closed north room');
 passed.push('closed room refused');
 // 3. A drag that needs to go around: into the south-east room through its open door.
 b=await toScreen({x:760,y:520});
 a=await toScreen(livia);
 await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:12});
 await page.screenshot({path:shots+'j02-route-through-door.png'});
 await page.mouse.up();
 livia=await pos('livia');
 if(Math.hypot(livia.x-760,livia.y-520)>1)throw Error('Route into the south-east room failed: '+JSON.stringify(livia));
 passed.push('route through open door');
 await page.getByRole('button',{name:'Annulla ultima modifica',exact:true}).click();
 livia=await pos('livia');
 // 4. Drag on the empty map pans; nobody moves.
 const before=await map.getAttribute('viewBox');
 const empty=await toScreen({x:480,y:150});
 await page.mouse.move(empty.x,empty.y);await page.mouse.down();await page.mouse.move(empty.x+120,empty.y+60,{steps:8});await page.mouse.up();
 const after=await map.getAttribute('viewBox');
 if(after===before)throw Error('Empty-map drag did not pan');
 const moved=await pos('livia');if(moved.x!==livia.x||moved.y!==livia.y)throw Error('Empty-map drag moved Livia');
 const selectedText=await page.evaluate(()=>getSelection().toString());
 if(selectedText.trim())throw Error('Drag selected page text: '+selectedText);
 passed.push('empty drag pans, no text selection');
 await page.getByRole('button',{name:'Centra la scena',exact:true}).click();
 // 5. Click on the empty map: nobody moves, the selection ring goes away.
 const c=await toScreen({x:480,y:150});await page.mouse.click(c.x,c.y);
 const after5=await pos('livia');if(after5.x!==livia.x||after5.y!==livia.y)throw Error('Empty click moved Livia');
 if(await page.locator('#battle-map .map-token.selected').count())throw Error('Empty click kept a selection');
 passed.push('empty click deselects');
 // 6. Wheel zoom at the cursor: the scene point under the cursor stays under it.
 const anchor={x:600,y:300};const s0=await toScreen(anchor);
 await page.mouse.move(s0.x,s0.y);await page.mouse.wheel(0,-240);await page.waitForTimeout(350);
 const s1=await toScreen(anchor);
 const vb=(await map.getAttribute('viewBox')).split(' ').map(Number);
 if(!(vb[2]<1000))throw Error('Wheel did not zoom: '+vb);
 if(Math.hypot(s1.x-s0.x,s1.y-s0.y)>3)throw Error('Zoom did not keep the cursor point: '+JSON.stringify([s0,s1]));
 await page.screenshot({path:shots+'j03-wheel-zoom.png'});
 passed.push('wheel zoom at cursor');
 await page.getByRole('button',{name:'Centra la scena',exact:true}).click();
 // 7. Keyboard: Tab to Livia, arrow right, Enter: one cell, focus stays on her token.
 await map.focus();
 for(let i=0;i<8;i++){await page.keyboard.press('Tab');if(await page.evaluate(()=>document.activeElement?.getAttribute('data-actor')==='livia'))break;}
 if(!await page.evaluate(()=>document.activeElement?.getAttribute('data-actor')==='livia'))throw Error('Tab did not reach Livia');
 const k0=await pos('livia');
 await page.keyboard.press('ArrowRight');await page.keyboard.press('Enter');
 const k1=await pos('livia');
 if(k1.x!==k0.x+50||k1.y!==k0.y)throw Error('Keyboard move is not one cell: '+JSON.stringify([k0,k1]));
 if(!await page.evaluate(()=>document.activeElement?.getAttribute('data-actor')==='livia'))throw Error('Focus left Livia after the move: '+await page.evaluate(()=>document.activeElement?.outerHTML?.slice(0,80)));
 await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
 const k2=await pos('livia');if(k2.y!==k1.y+50)throw Error('Second keyboard move failed');
 passed.push('keyboard move one cell, focus kept');
 if(errors.length)throw Error(errors.join(';'));
 return {passed};
}
