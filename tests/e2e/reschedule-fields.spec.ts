import {test,expect} from '@playwright/test';
for(const notes of [null,'Observação da sessão'])for(const series of [false,true]){
 test(`reagendamento preenche término: observação=${!!notes}, série=${series}`,async({page})=>{
  await page.clock.install({time:new Date('2030-10-12T12:00:00Z')});
  const patient={id:'patient',professionalId:'professional',fullName:'Paciente teste',phone:'11999999999',email:null,birthDate:null,preferredChannel:'WHATSAPP',consentStatus:'GRANTED',active:true};
  const item={id:'appointment',patientId:'patient',patientName:'Paciente teste',startsAt:'2030-10-14T22:00:00Z',endsAt:'2030-10-14T22:50:00Z',modality:'ONLINE',status:'SCHEDULED',meetingLink:null,notes,seriesId:series?'series':null,seriesPosition:series?0:null};
  await page.addInitScript(()=>localStorage.setItem('confirma.session.v2',JSON.stringify({accessToken:'test',userId:'user',professionalId:'professional',name:'Ana',role:'PROFESSIONAL'})));
  await page.route('**/api/v1/**',async route=>{
   const path=new URL(route.request().url()).pathname;
   if(path.endsWith('/cancel')){item.status='CANCELED';await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify([item])});return;}
   const body=path.endsWith('/professionals/me')?{id:'professional',fullName:'Ana',email:'ana@example.com',timezone:'America/Sao_Paulo',defaultSessionMinutes:50,defaultModality:'ONLINE',active:true,remindersEnabled:true}:path.endsWith('/patients')?{content:[patient],totalElements:1,last:true}:path.endsWith('/schedule-blocks')?[]:path.endsWith('/sessions')?[item]:[];
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  });
  await page.goto('/');await page.getByRole('button',{name:/Sessões$/}).click();await page.getByRole('button',{name:'Lista de sessões',exact:true}).click();await page.getByRole('button',{name:/Paciente teste Online/}).click();
  await expect(page.getByLabel('Início',{exact:true})).toHaveAttribute('readonly','');await expect(page.getByLabel('Término',{exact:true})).toHaveAttribute('readonly','');
  await page.getByRole('button',{name:'Reagendar sessão',exact:true}).click();
  await expect(page.getByLabel('Nova data e horário')).not.toHaveAttribute('readonly','');await expect(page.getByLabel('Novo término')).not.toHaveAttribute('readonly','');
  await expect(page.getByLabel('Nova data e horário')).toHaveValue('2030-10-14T19:00');await expect(page.getByLabel('Novo término')).toHaveValue('2030-10-14T19:50');
  await page.getByRole('button',{name:'Voltar',exact:true}).click();await expect(page.locator('input[name="notes"]')).toHaveValue(notes??'');
  await page.getByRole('button',{name:'Cancelar sessão',exact:true}).click();
  const scope=page.getByLabel('Quais sessões cancelar?');
  if(series)await scope.selectOption('FOLLOWING');else await expect(scope.locator('option')).toHaveCount(1);
  await page.getByRole('button',{name:'Confirmar cancelamento',exact:true}).click();
  await page.getByRole('button',{name:/Paciente teste Online/}).click();
  await page.getByRole('button',{name:'Agendar nova sessão neste horário',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Nova sessão',exact:true})).toBeVisible();
  await expect(page.getByLabel('Início',{exact:true})).toHaveValue('2030-10-14T19:00');
  await expect(page.locator('select[name="patientId"]')).toHaveValue('patient');

 });
}
