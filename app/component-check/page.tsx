"use client";
import React, { useState } from 'react';
import ClinicalCodeInput from '../ehr/clinical-code-input';
import { TreatmentGoalEditor, TreatmentGoalSummary } from '../ehr/treatment-goals';
import { newTreatmentGoals } from '../../lib/ehr/treatment-goals';
export default function Check(){
 const [code,setCode]=useState('');const [billing,setBilling]=useState('');const [goals,setGoals]=useState(newTreatmentGoals);const [saved,setSaved]=useState(null);
 return <main style={{maxWidth:900,margin:'24px auto',padding:24,fontFamily:'Arial',color:'#202020'}}>
 <h1>Clinical field preview — synthetic data only</h1>
 <ClinicalCodeInput kind="diagnosis" label="Primary ICD-10-CM Diagnosis" value={code} onChange={e=>setCode(e.target.value)}/>
 <ClinicalCodeInput kind="billing" label="CPT / HCPCS Code" value={billing} onChange={e=>setBilling(e.target.value)}/>
 <TreatmentGoalEditor goals={goals} onChange={setGoals}/>
 <button onClick={()=>setSaved(JSON.parse(JSON.stringify({goals})))}>Preview saved goals</button>
 {saved && <section aria-label="Saved goal preview"><TreatmentGoalSummary plan={saved}/></section>}
 </main>
}
