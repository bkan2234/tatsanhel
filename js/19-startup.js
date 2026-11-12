/* PROGRAM GÜVENLİ BAŞLATMA - tüm fonksiyonlar ve il/ilçe datası tanımlandıktan sonra */
(function bootCariTakip(){
  try{
    if(typeof renderAll === "function") renderAll();
    if(typeof initCityDistrictSelects === "function") initCityDistrictSelects();
  }catch(err){
    console.error("Program başlatma hatası:", err);
    alert("Program başlatılırken hata oluştu: " + (err && err.message ? err.message : err));
  }
})();
