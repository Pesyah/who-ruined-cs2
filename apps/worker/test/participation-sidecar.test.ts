import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { afterEach, describe, expect, it } from 'vitest';
import type { C2S2PreparedProfileDto } from '@who-ruined/contracts';
import {
  C2S2_MODEL_VERSION,
  C2S2_POLICY_DIGEST,
  C2S2_REFERENCE_VERSION,
  H2_PARTICIPATION_RATING_POLICY,
  HISTORICAL_H1_PARTICIPATION_POLICY_IDENTITY,
  PARTICIPATION_SIDECAR_POLICY_IDENTITIES,
  projectParticipationRatings,
  selectParticipationAwards,
  type ParticipationRatingPreparedProfile,
} from '@who-ruined/scoring';
import { PARTICIPATION_SIDECAR_POLICIES, PARTICIPATION_SIDECAR_SCHEMA_VERSION, classifyParticipation, participationSidecarRelativePath, persistParticipationSidecar, readParticipationSidecar, validateParticipationSidecar, type ParticipationSidecar } from '../src/participation-sidecar.js';

const roots:string[]=[];afterEach(async()=>{for(const root of roots.splice(0))await rm(root,{recursive:true,force:true});});
const base={globalComplete:true,liveStart:100,liveEnd:200,startObserved:true,startAlive:true,startTeamNum:2,expectedTeamNum:2,disconnectedBeforeStart:false,reconnectedBeforeStart:false,deathTick:null,lifecycle:[],gameplayEventCount:0};
function prepared(key:string,teamId:string,harm=-.04):C2S2PreparedProfileDto{return{profileKey:key,playerId:key,teamId,scenario:'BOMB',rounds:2,validRounds:2,tRounds:1,ctRounds:1,requiredInputStatus:'COMPLETE',p4BPlus:{status:'CALCULATED_RESEARCH_ONLY',reason:null,familyContributions:{COMBAT:.1,SUPPORT:0,DEATH_RELATED:0,DIRECT_HARM:harm,CONTEXT:0,OBJECTIVES:0},episodeContributions:[{anchorId:'round_1:harm',chosenAxis:'allyHp',family:'DIRECT_HARM',base:harm,tags:[]}]},p4CPlus:{status:'CALCULATED_RESEARCH_ONLY',reason:null,familyContributions:{COMBAT:.1,SUPPORT:0,DEATH_RELATED:0,DIRECT_HARM:harm,CONTEXT:0,OBJECTIVES:0},objectiveSignals:{'objective:plants':0,'objective:defuses':0},episodeContributions:[{anchorId:'round_1:harm',chosenAxis:'allyHp',family:'DIRECT_HARM',base:harm,tags:[]}]}};}
function fixture():ParticipationSidecar{const profiles=Array.from({length:9},(_,i)=>{const team=i<4?'a':'b',p=prepared(`P${i+1}`,team);return{profileKey:p.profileKey,playerId:p.playerId,teamId:team,status:'ELIGIBLE' as const,reason:null,verifiedRounds:2,absentRounds:0,partialRounds:0,unknownRounds:0,globalExcludedRounds:0,tRounds:1,ctRounds:1,countedRoundIds:['round_1','round_2'],excludedRoundIds:[],prepared:p};});return{schemaVersion:PARTICIPATION_SIDECAR_SCHEMA_VERSION,createdAt:'2026-10-24T00:00:00.000Z',fingerprint:'f'.repeat(64),binding:{matchId:'m',fileSha256:'a'.repeat(64),parserVersion:'0.42.0',normalizerVersion:'m2.5-0.2.0'},model:{preparedInputModel:C2S2_MODEL_VERSION,preparedInputDigest:C2S2_POLICY_DIGEST,referenceVersion:C2S2_REFERENCE_VERSION,policies:PARTICIPATION_SIDECAR_POLICIES},scenario:'BOMB',participation:[],profiles,provenance:{source:'RAW_DEMO_EVENTS_AND_TICKS',lifecycleEvents:[],contextTags:[],s2AppliedBy:'test'}};}

function project(value: ParticipationSidecar) {
  const profiles: ParticipationRatingPreparedProfile[] = value.profiles.map((profile) => ({
    profileKey: profile.profileKey,
    playerId: profile.playerId,
    teamId: profile.teamId,
    status: profile.status,
    reason: profile.reason,
    prepared: profile.prepared,
  }));
  return projectParticipationRatings(profiles);
}

describe('player participation state machine',()=>{
  it('keeps a post-death disconnect as present and marks a live disconnect partial',()=>{expect(classifyParticipation({...base,deathTick:140,lifecycle:[{kind:'player_disconnect',tick:150}]}).classification).toBe('PRESENT_VERIFIED');expect(classifyParticipation({...base,deathTick:170,lifecycle:[{kind:'player_disconnect',tick:150}]}).classification).toBe('INTERRUPTED_PARTIAL_ROUND');});
  it('does not invent absence from silence and separates global boundary failure',()=>{expect(classifyParticipation({...base,startObserved:false,startAlive:null,startTeamNum:null}).classification).toBe('PARTICIPATION_UNKNOWN');expect(classifyParticipation({...base,globalComplete:false}).classification).toBe('ROUND_GLOBAL_EVIDENCE_MISSING');});
  it('requires explicit disconnected non-playing evidence for a full absence',()=>{expect(classifyParticipation({...base,startAlive:false,startTeamNum:1,disconnectedBeforeStart:true}).classification).toBe('ABSENT_FULL_ROUND_VERIFIED');});
});

describe('versioned participation sidecar and frozen policies',()=>{
  it('persists atomically, validates schema, and is immutable by fingerprint',async()=>{const root=await mkdtemp(path.join(os.tmpdir(),'wrc-p72e-'));roots.push(root);const value=fixture(),relative=await persistParticipationSidecar(root,value);expect(relative).toBe(participationSidecarRelativePath('m','a'.repeat(64)));expect(validateParticipationSidecar(JSON.parse(gunzipSync(await readFile(path.join(root,...relative.split('/')))).toString('utf8'))).fingerprint).toBe(value.fingerprint);expect((await readParticipationSidecar(root,relative)).fingerprint).toBe(value.fingerprint);await expect(persistParticipationSidecar(root,{...value,fingerprint:'e'.repeat(64)})).rejects.toThrow('PARTICIPATION_SIDECAR_INVALID_EXISTING');});
  it('rejects old or corrupt schema loudly',async()=>{expect(()=>validateParticipationSidecar({schemaVersion:'m3c8-c2s2-prepared-sidecar-1'})).toThrow('PARTICIPATION_SIDECAR_SCHEMA_MISMATCH');const root=await mkdtemp(path.join(os.tmpdir(),'wrc-p72e-'));roots.push(root);const relative=participationSidecarRelativePath('m','a'.repeat(64)),target=path.join(root,...relative.split('/'));await import('node:fs/promises').then(({mkdir})=>mkdir(path.dirname(target),{recursive:true}));await writeFile(target,'bad');await expect(readParticipationSidecar(root,relative)).rejects.toThrow();});
  it('reads the legacy two-policy sidecar metadata while projecting H2 only',()=>{
    const value=fixture(),h2=project(value);
    const awards=selectParticipationAwards(h2,[{teamId:'a',score:13},{teamId:'b',score:8}]);
    expect(value.model.policies).toEqual(PARTICIPATION_SIDECAR_POLICY_IDENTITIES);
    expect(value.model.policies[0]).toEqual({
      id: H2_PARTICIPATION_RATING_POLICY.id,
      digest: H2_PARTICIPATION_RATING_POLICY.digest,
      harmMultiplier: H2_PARTICIPATION_RATING_POLICY.harmMultiplier
    });
    expect(value.model.policies[1]).toEqual(HISTORICAL_H1_PARTICIPATION_POLICY_IDENTITY);
    expect(h2).toHaveLength(9);
    expect(awards.eligiblePoolSize).toBe(9);
    expect(awards.mvp.awardPoolSize).toBe(9);
    for(const row of h2){
      if(row.status!=='CALCULATED_RESEARCH_ONLY') throw new Error('synthetic projection unexpectedly unavailable');
      expect(row.finalAttribution.DIRECT_HARM).toBe(2 * row.rawFamilyInputs.DIRECT_HARM);
    }
  });
});
