(function(root){
    'use strict';
    const api=root.ExcabaseFleetEngine;
    function validateGrader(c){return api.validatePassActivity(c);}
    class GraderEngine extends api.PassActivityEngine{constructor(config){super(validateGrader(config));}}
    Object.assign(api,{GraderEngine,validateGrader});
})(typeof window!=='undefined'?window:globalThis);
