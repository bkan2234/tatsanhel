/* Device-adaptive navigation. No application state or cloud credentials are modified. */
(function(){
  var toggle=document.getElementById('mobileMenuToggle');
  var backdrop=document.getElementById('mobileMenuBackdrop');
  var menu=document.getElementById('menu');
  var current=document.getElementById('mobileCurrentPage');
  if(!toggle||!menu)return;
  function close(){document.body.classList.remove('mobile-nav-open');toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Menüyü aç');}
  function open(){document.body.classList.add('mobile-nav-open');toggle.setAttribute('aria-expanded','true');toggle.setAttribute('aria-label','Menüyü kapat');}
  toggle.addEventListener('click',function(){document.body.classList.contains('mobile-nav-open')?close():open();});
  if(backdrop)backdrop.addEventListener('click',close);
  menu.addEventListener('click',function(e){var btn=e.target.closest('button[data-view]');if(btn){if(current)current.textContent=btn.textContent.trim();close();}});
  document.addEventListener('keydown',function(e){if(e.key==='Escape')close();});
  window.addEventListener('resize',function(){if(window.innerWidth>=1024)close();});
  if(current){var active=menu.querySelector('button.active');if(active)current.textContent=active.textContent.trim();}
})();
