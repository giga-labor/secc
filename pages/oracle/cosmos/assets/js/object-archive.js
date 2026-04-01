// Unified fixed object archive loader.
// Exposes window.SECC_OBJECT_ARCHIVE from data/object-archive.json.
(function(){
  'use strict';
  var ARCHIVE_PATH='pages/oracle/cosmos/data/object-archive.json';
  var data=null;
  try{
    var xhr=new XMLHttpRequest();
    xhr.open('GET', ARCHIVE_PATH, false);
    xhr.send(null);
    if(((xhr.status>=200 && xhr.status<300) || xhr.status===0) && xhr.responseText){
      data=JSON.parse(xhr.responseText);
    }
  }catch(_e){
    data=null;
  }
  window.SECC_OBJECT_ARCHIVE = (data && typeof data==='object') ? data : null;
})();


