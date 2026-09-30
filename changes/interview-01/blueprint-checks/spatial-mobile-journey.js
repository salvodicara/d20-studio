async (rootPage) => {
 const fixture=await rootPage.evaluate(()=>localStorage.getItem('d20-studio-blueprint-v1'));
 const context=await rootPage.context().browser().newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,storageState:{cookies:[],origins:[{origin:'http://127.0.0.1:8879',localStorage:[{name:'d20-studio-blueprint-v1',value:fixture}]}]}});
 const page=await context.newPage(),errors=[],passed=[];
 page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{window.__spatialErrors=[];window.addEventListener('error',e=>window.__spatialErrors.push(e.message));});
 await page.route('**/*.mjs',r=>r.continue());await page.goto('http://127.0.0.1:8879/#table');
 const button=name=>page.getByRole('button',{name,exact:true});
 // Refreshed by R3 (27/09/2026), P6 TV-06: on a phone the map tools fold behind «Map tools»;
 // unfold them, then the tool (its group first when the group shows only its button).
 const tool=async(name)=>{
  const fold=page.locator('#content [data-map-tools-toggle][aria-expanded="false"]');
  if(await fold.count()&&await fold.first().isVisible()){await fold.first().tap();await page.locator('#content [data-map-tools-toggle][aria-expanded="true"]').waitFor();}
  const target=page.getByRole('button',{name,exact:true}).first();
  if(!(await target.isVisible())){const group=await target.evaluate(el=>el.closest('.map-tool-cluster')?.querySelector('[data-tool-group]')?.dataset.toolGroup??null);if(group)await page.locator('[data-tool-group="'+group+'"]').tap();}
  await target.tap();
 };
 const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('d20-studio-blueprint-v1')));
 const check=(v,m)=>{if(!v)throw Error(m);};
 check((await saved()).actors.livia.movement===9&&(await saved()).actors.livia.action,'Run spatial journey first');
 // Refreshed by R3 (27/09/2026): the header services are reached by their service id (the
 // phone header shows them as icons).
 await page.locator('[data-service="preferences"]').first().tap();await page.locator('[name=lang]').selectOption('en');await button('Salva preferenze').tap();
 await button('Quarterstaff').tap();await page.keyboard.press('Escape');check(await page.locator('#combat-detail h3').count()===0,'Escape from action bar did not cancel');
 passed.push('Escape cancels action without requiring map focus');
 const door=page.locator('[data-door]');await door.scrollIntoViewIfNeeded();const box=await door.boundingBox();check(box.width>=41,'Door hit area below visible touch target');await door.tap();
 check((await page.locator('#dialog').innerText()).includes('Utilize action'),'Second interaction cost absent');
 await button('Close with Livia').tap();let data=await saved();check(!data.actors.livia.action,'Second door interaction did not use action');await button('Undo last change').tap();data=await saved();check(data.actors.livia.action,'Door correction did not restore action');
 passed.push('touch door control with explicit Utilize cost and undo');
 await tool('Plan path');const map=page.locator('#battle-map');await map.scrollIntoViewIfNeeded();const point=await map.evaluate(svg=>{const p=svg.createSVGPoint();p.x=460;p.y=350;const q=p.matrixTransform(svg.getScreenCTM());return{x:q.x,y:q.y};});await page.touchscreen.tap(point.x,point.y);
 check(await page.locator('[data-path-edit]').count()===1,'Touch waypoint absent');
 await page.locator('[data-service="preferences"]').first().tap();await page.locator('[name=offline]').check();await button('Save preferences').tap();const before=JSON.stringify(await saved());await button('Execute path').tap();check(JSON.stringify(await saved())===before,'Offline path mutated shared state');
 await button('Cancel path').tap();check(await page.locator('[data-path-edit]').count()===0,'Touch cancel failed');
 passed.push('touch waypoint and cancellation','offline execution preserves private plan without shared mutation');
 await page.locator('[data-service="preferences"]').first().tap();await page.locator('[name=offline]').uncheck();await button('Save preferences').tap();
 await button('Quarterstaff').tap();await page.locator('[data-actor="goblin-1"]').tap();data=await saved();
 const a=data.combatAttempts.at(-1);check(a.approach&&a.status==='resolved'&&!data.actors.livia.action,'Digital approach failed to finish attack');check(!(await page.locator('#dialog').isVisible()),'Digital approach introduced extra dialog');
 passed.push('touch target click approaches and attacks digitally without extra confirmation');
 check(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)),'Mobile horizontal overflow');
 await page.waitForFunction(()=>!document.querySelector('#toast').classList.contains('shown'));await map.scrollIntoViewIfNeeded();
 await page.screenshot({path:'/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-23/spatial-mobile-en.png',fullPage:true});
 await page.setViewportSize({width:1440,height:1000});await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 check(errors.length===0,errors.join(';'));check((await page.evaluate(()=>window.__spatialErrors)).length===0,'Window errors');passed.push('EN touch layout and resize without overflow or runtime errors');
 await context.close();return{passed,errors};
}
