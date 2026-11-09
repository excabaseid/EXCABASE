(function(root){
    'use strict';
    const api=root.ExcabaseFleetEngine;
    function validateCompactor(c){
        if(c.basis!=='ccm'&&c.basis!=='m2')throw new Error('Compactor membutuhkan volume CCM atau luas m², bukan volume lepas tanpa konversi.');
        return api.validatePassActivity(c);
    }
    class CompactorEngine extends api.PassActivityEngine{
        constructor(config){super(validateCompactor(config));}
        snapshot(){return {...super.snapshot(),densityCertified:false};}
    }
    Object.assign(api,{CompactorEngine,validateCompactor});
})(typeof window!=='undefined'?window:globalThis);
