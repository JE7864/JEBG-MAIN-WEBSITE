(() => {
'use strict';
const native=document.getElementById('expert-specialisations');
if(!native)return;
const field=document.getElementById('expert-specialisation-field');
const form=native.form;
const MAX_LENGTH=250;
const MAX_CUSTOM_LENGTH=80;
const cleanSkill=value=>String(value).replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim();
const skillKey=value=>cleanSkill(value).toLowerCase();
const catalog=[...native.querySelectorAll('optgroup')].map(group=>({name:group.label,skills:[...group.querySelectorAll('option')].map(option=>option.value)}));
const allowed=new Set(catalog.flatMap(group=>group.skills));
const selected=new Set([...native.selectedOptions].map(option=>option.value).filter(value=>allowed.has(value)));
const picker=document.createElement('div');picker.className='skill-picker';
const chips=document.createElement('div');chips.className='skill-selection';chips.setAttribute('aria-label','Selected specialisations');
const row=document.createElement('div');row.className='skill-search-row';
const input=document.createElement('input');input.type='text';input.id='expert-skill-search';
input.placeholder='Type to search and add skills';input.autocomplete='off';input.spellcheck=false;
input.maxLength=120;
input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-expanded','false');input.setAttribute('aria-controls','expert-skill-list');input.setAttribute('aria-describedby','specialisation-help skill-feedback');input.setAttribute('aria-required','true');
const toggle=document.createElement('button');toggle.type='button';toggle.className='skill-toggle';toggle.textContent='⌄';toggle.setAttribute('aria-label','Show specialisation options');toggle.setAttribute('aria-controls','expert-skill-list');toggle.setAttribute('aria-expanded','false');
const list=document.createElement('div');list.id='expert-skill-list';list.className='skill-dropdown';list.setAttribute('role','listbox');list.setAttribute('aria-label','Available specialisations');list.hidden=true;
const feedback=document.createElement('div');feedback.id='skill-feedback';feedback.className='skill-feedback';feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');
const hidden=document.createElement('input');hidden.type='hidden';hidden.name='specialisation';
row.append(input,toggle);picker.append(chips,row,list);
let displayed=[],active=-1;
function say(message,error=false){feedback.textContent=message;feedback.dataset.error=String(error);}
function valid(){input.setCustomValidity(selected.size?'':'Choose at least one listed skill or explicitly add a custom skill.');}
function sync(){hidden.value=[...selected].join('; ');[...native.options].forEach(option=>{option.selected=selected.has(option.value);});valid();}
function close(){list.hidden=true;input.setAttribute('aria-expanded','false');toggle.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');active=-1;}
function setActive(index){active=index;displayed.forEach((entry,i)=>entry.element.dataset.active=String(i===active));if(active>=0){const element=displayed[active].element;input.setAttribute('aria-activedescendant',element.id);element.scrollIntoView({block:'nearest'});}else input.removeAttribute('aria-activedescendant');}
function render(){
 list.replaceChildren();displayed=[];active=-1;input.removeAttribute('aria-activedescendant');
 const query=input.value.trim().toLowerCase();
 catalog.forEach(group=>{
  const skills=group.skills.filter(skill=>!selected.has(skill)&&(!query||skill.toLowerCase().includes(query)||group.name.toLowerCase().includes(query)));
  if(!skills.length)return;
  const groupElement=document.createElement('div');groupElement.setAttribute('role','group');groupElement.setAttribute('aria-label',group.name);
  const heading=document.createElement('div');heading.className='skill-group-label';heading.textContent=group.name;heading.setAttribute('aria-hidden','true');groupElement.append(heading);
  skills.forEach(skill=>{const option=document.createElement('div');option.className='skill-option';option.id='expert-skill-option-'+displayed.length;option.setAttribute('role','option');option.setAttribute('aria-selected','false');option.textContent=skill;
   option.addEventListener('mousedown',event=>event.preventDefault());
   option.addEventListener('click',()=>add(skill));
   displayed.push({skill,element:option});groupElement.append(option);
  });list.append(groupElement);
 });
 const custom=cleanSkill(input.value);
 const exactListed=[...allowed].some(skill=>skillKey(skill)===skillKey(custom));
 const exactSelected=[...selected].some(skill=>skillKey(skill)===skillKey(custom));
 if(custom&&!exactListed&&!exactSelected&&custom.length<=MAX_CUSTOM_LENGTH){
  const option=document.createElement('div');option.className='skill-option skill-custom-option';option.id='expert-skill-option-'+displayed.length;option.setAttribute('role','option');option.setAttribute('aria-selected','false');option.textContent='Add “'+custom+'” as a custom skill';
  option.addEventListener('mousedown',event=>event.preventDefault());option.addEventListener('click',()=>add(custom,true));
  displayed.push({skill:custom,custom:true,element:option});list.append(option);
 }
 if(!displayed.length){const empty=document.createElement('p');empty.className='skill-empty';empty.textContent=exactSelected?'This skill is already selected.':custom.length>MAX_CUSTOM_LENGTH?'Custom skills can be up to '+MAX_CUSTOM_LENGTH+' characters. Shorten the skill name.':'No matching skills. Type a specific skill to add it.';list.append(empty);}
}
function open(){render();list.hidden=false;input.setAttribute('aria-expanded','true');toggle.setAttribute('aria-expanded','true');}
function renderChips(){
 chips.replaceChildren();selected.forEach(skill=>{const chip=document.createElement('span');chip.className='skill-chip';const text=document.createElement('span');text.textContent=skill;
 if(!allowed.has(skill))chip.setAttribute('title','Custom skill');
 const remove=document.createElement('button');remove.type='button';remove.textContent='×';remove.setAttribute('aria-label','Remove '+skill);
 remove.addEventListener('click',()=>{selected.delete(skill);sync();renderChips();input.focus();open();say(skill+' removed. '+selected.size+' selected.');form.dispatchEvent(new Event('change',{bubbles:true}));});
 chip.append(text,remove);chips.append(chip);});
}
function add(skill,custom=false){
 skill=cleanSkill(skill);
 const listed=[...allowed].find(option=>skillKey(option)===skillKey(skill));
 if(listed)skill=listed;
 else if(!custom||!skill||skill.length>MAX_CUSTOM_LENGTH)return;
 if([...selected].some(option=>skillKey(option)===skillKey(skill))){say('This skill is already selected.',true);return;}
 if([...selected,skill].join('; ').length>MAX_LENGTH){say('The selected skills have reached the form limit. Remove a skill to add this one, or describe additional skills in Skills & relevant work.',true);return;}
 selected.add(skill);sync();renderChips();input.value='';input.focus();open();say(skill+' added. '+selected.size+' selected.');form.dispatchEvent(new Event('change',{bubbles:true}));
}
input.addEventListener('focus',open);
input.addEventListener('input',()=>{open();say(displayed.length+' choices. Select a suggestion or the Add custom skill option.');});
input.addEventListener('keydown',event=>{
 if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();if(list.hidden)open();if(!displayed.length)return;const next=event.key==='ArrowDown'?(active+1)%displayed.length:(active<=0?displayed.length-1:active-1);setActive(next);}
 else if(event.key==='Enter'){event.preventDefault();if(list.hidden){open();return;}if(displayed.length){const entry=displayed[active<0?0:active];add(entry.skill,entry.custom===true);}else say('Choose a suggestion or shorten the custom skill name.',true);}
 else if(event.key==='Escape'){if(!list.hidden){event.preventDefault();event.stopPropagation();close();}}
 else if(event.key==='Tab')close();
});
input.addEventListener('invalid',()=>{say('Choose at least one skill from the dropdown.',true);});
toggle.addEventListener('click',()=>{if(list.hidden){input.focus();open();}else close();});
field.addEventListener('focusout',event=>{if(!field.contains(event.relatedTarget))close();});
document.addEventListener('click',event=>{if(!field.contains(event.target))close();});
form.addEventListener('submit',()=>{sync();close();},true);
form.addEventListener('reset',()=>{selected.clear();input.value='';sync();renderChips();close();say('');});
native.hidden=true;native.required=false;native.removeAttribute('name');
field.querySelector('label').htmlFor=input.id;
field.insertBefore(picker,native);field.append(hidden,feedback);
document.getElementById('specialisation-help').textContent='Search and select skills, or choose Add to confirm a custom skill (up to 80 characters). Use × to remove a selection. Arrow keys and Enter also select.';
sync();renderChips();
})();
