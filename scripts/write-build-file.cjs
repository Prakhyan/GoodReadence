// Replace complete generated data atomically, tolerating brief Windows file locks.
const fs=require('fs'),path=require('path');
module.exports=function writeBuildFile(file,contents){
 const temporary=path.join(path.dirname(file),'.build-'+process.pid+'-'+Date.now()+'-'+Math.random().toString(16).slice(2)+'.tmp');
 try{
  fs.writeFileSync(temporary,contents);
  for(let attempt=0;;attempt++)try{fs.renameSync(temporary,file);break}catch(error){if(attempt>=7||!['UNKNOWN','EBUSY','EPERM','EACCES'].includes(error.code))throw error;Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,100*(attempt+1))}
 }finally{if(fs.existsSync(temporary))fs.unlinkSync(temporary)}
};
