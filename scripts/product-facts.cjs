const fs=require('fs'),vm=require('vm');module.exports=()=>{const context={window:{}};vm.runInNewContext(fs.readFileSync('product-facts.js','utf8'),context);return context.window.GRFacts};
