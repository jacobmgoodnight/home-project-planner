/** Serial persistence with revision-aware UI status. One failed write never masks newer pending writes. */
export function createSaveQueue(persist,onStatus=()=>{}){
 let revision=0,committed=0,latestFailure=0;
 let tail=Promise.resolve();
 let state='saved',message='';
 const announce=(newState,error='')=>{state=newState;message=error;onStatus({state,error,revision,committed})};
 return {
  enqueue(snapshot){
   const next=++revision;
   announce('saving');
   const operation=tail.catch(()=>{}).then(()=>persist(snapshot)).then(()=>{
     committed=Math.max(committed,next);
     if(next===revision){latestFailure=0;announce('saved');}
   },error=>{
     if(next===revision){
       latestFailure=next;
       announce('error',error instanceof Error?error.message:String(error));
     }
     throw error;
   });
   tail=operation;
   return operation;
  },
  getStatus(){return {state,error:message,revision,committed,hasUnsaved:committed<revision||latestFailure>0}},
  wait(){return tail},
  needsUnloadWarning(){return committed<revision||latestFailure>0}
 };
}
