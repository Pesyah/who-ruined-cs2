import type { C2S2PreparedProfileDto, MatchData } from '@who-ruined/contracts';
import { sha256Canonical } from '@who-ruined/artifacts';
import { NORMALIZER_VERSION, PARSER_LIBRARY_VERSION, readParticipationEvidenceFacts, type ParsedDemoSnapshot } from '@who-ruined/parser-adapter';
import {
  C2S2_MODEL_VERSION,
  C2S2_POLICY_DIGEST,
  C2S2_REFERENCE_VERSION,
  type ParticipationEpisodeContribution,
  type ParticipationFamily,
} from '@who-ruined/scoring';
import { buildPreparedParticipationInput } from './prepared-participation-input.js';
import { classifyParticipation } from './participation-evidence.js';
import {
  P72_POLICY,
  PARTICIPATION_SIDECAR_SCHEMA_VERSION,
  type ParticipationClass,
  type ParticipationProfile,
  type ParticipationRound,
  type ParticipationSidecar,
} from './participation-model.js';
import { validateParticipationSidecar } from './participation-sidecar-codec.js';

export * from './participation-evidence.js';
export * from './participation-model.js';
export * from './participation-sidecar-codec.js';

const REFS:Record<string,number>={enemyHp:28.237442028985516,enemyKills:.3197764705882353,enemyArmor:5.049757894736842,assists:.1183588235294118,enemyBlind:.6614618600853558,ownDeaths:.1586729096989967,allyHp:.6540792744080582,allyKills:.012540613564485997,allyBlind:.303433612623422,allyArmor:.05294927459493805};
const WEIGHTS:Record<string,number>={enemyHp:.14,enemyKills:.175,enemyArmor:.035,assists:.125,enemyBlind:.125,ownDeaths:.2,allyHp:.05,allyKills:.05,allyBlind:.05,allyArmor:.05};
const DIRECTIONS:Record<string,number>={enemyHp:1,enemyKills:1,enemyArmor:1,assists:1,enemyBlind:1,ownDeaths:-1,allyHp:-1,allyKills:-1,allyBlind:-1,allyArmor:-1};
const FAMILIES:Record<string,Exclude<ParticipationFamily,'CONTEXT'|'OBJECTIVES'>>={enemyHp:'COMBAT',enemyKills:'COMBAT',enemyArmor:'COMBAT',assists:'SUPPORT',enemyBlind:'SUPPORT',ownDeaths:'DEATH_RELATED',allyHp:'DIRECT_HARM',allyKills:'DIRECT_HARM',allyBlind:'DIRECT_HARM',allyArmor:'DIRECT_HARM'};
const BASELINES={COMBAT:.6301839531026205,SUPPORT:.36749503251163657,DEATH_RELATED:-.9163102943158531,DIRECT_HARM:0};
const CONTEXT_TAGS=['OPENING','TRADE','FAST_TRADE','MULTI_KILL','DISADVANTAGE','ALIVE_LEAD_TAKEN','POSTPLANT','FLASH_ASSIST','FLASH_TEAM_KILL_WINDOW','FLASH_TEAM_DAMAGE_WINDOW','LOW_EQUIP_COMBAT'];
const MATERIAL_KINDS=new Set(['PLAYER_DEATH','PLAYER_HURT','PLAYER_BLIND','BOMB_PLANTED','BOMB_DEFUSED','BOMB_EXPLODED','HOSTAGE_RESCUED','HOSTAGE_HURT']);
const finite=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v);
const digest=sha256Canonical;

function anchorRound(anchorId:string,eventRounds:Map<string,string>,roundIds:string[]):string|null{const direct=eventRounds.get(anchorId);if(direct)return direct;return roundIds.find((id)=>anchorId===id||anchorId.startsWith(`${id}:`))??null;}
function prepareProfile(base:ReturnType<typeof buildPreparedParticipationInput>,source:C2S2PreparedProfileDto,allowed:Set<string>,roundById:Map<string,MatchData['rounds'][number]>,teamId:string,eventRounds:Map<string,string>):C2S2PreparedProfileDto{
  const tRounds=[...allowed].filter((id)=>roundById.get(id)?.sideByTeamId[teamId]==='T').length,ctRounds=[...allowed].filter((id)=>roundById.get(id)?.sideByTeamId[teamId]==='CT').length;
  const unavailable=(status:'WITHHELD_REQUIRED_INPUT'|'UNKNOWN_APPLICABILITY',reason:string)=>({status,reason});
  if(source.requiredInputStatus!=='COMPLETE')return{...source,rounds:allowed.size,tRounds,ctRounds,p4BPlus:unavailable('WITHHELD_REQUIRED_INPUT',source.requiredInputStatus),p4CPlus:unavailable('WITHHELD_REQUIRED_INPUT',source.requiredInputStatus)};
  const physical=base.physicalAnchors.filter((a)=>a.profileKey===source.profileKey&&allowed.has(anchorRound(a.anchorId,eventRounds,[...roundById.keys()])??''));
  const signals={COMBAT:0,SUPPORT:0,DEATH_RELATED:0,DIRECT_HARM:0};const episodes:ParticipationEpisodeContribution[]=[];
  for(const ep of physical){const candidates=Object.entries(ep.components).filter(([axis,value])=>axis in REFS&&finite(value)).map(([axis,value])=>({axis,value:DIRECTIONS[axis]!*WEIGHTS[axis]!*value/REFS[axis]!/allowed.size})).sort((a,b)=>Math.abs(b.value)-Math.abs(a.value)||a.axis.localeCompare(b.axis));const chosen=candidates[0];if(!chosen)continue;const family=FAMILIES[chosen.axis]!;signals[family]+=chosen.value;episodes.push({anchorId:ep.anchorId,chosenAxis:chosen.axis,family,base:chosen.value,tags:ep.tags});}
  const families={COMBAT:.1*(signals.COMBAT-BASELINES.COMBAT),SUPPORT:.1*(signals.SUPPORT-BASELINES.SUPPORT),DEATH_RELATED:.1*(signals.DEATH_RELATED-BASELINES.DEATH_RELATED),DIRECT_HARM:.1*signals.DIRECT_HARM,CONTEXT:0,OBJECTIVES:0};
  const p4BPlus=allowed.size?{status:'CALCULATED_RESEARCH_ONLY' as const,reason:null,familyContributions:families,episodeContributions:episodes}:unavailable('WITHHELD_REQUIRED_INPUT','WITHHELD_INSUFFICIENT_VERIFIED_EXPOSURE');
  let p4CPlus:C2S2PreparedProfileDto['p4CPlus'];
  if(base.scenario==='UNKNOWN')p4CPlus=unavailable('UNKNOWN_APPLICABILITY','SCENARIO_UNKNOWN');
  else if(!allowed.size||base.scenario==='BOMB'&&!(tRounds&&ctRounds)||base.scenario==='HOSTAGE'&&!ctRounds)p4CPlus=unavailable('WITHHELD_REQUIRED_INPUT','WITHHELD_INSUFFICIENT_VERIFIED_EXPOSURE');
  else{const plants=physical.filter((a)=>finite(a.components.plants)).reduce((n,a)=>n+(a.components.plants??0),0),defuses=physical.filter((a)=>finite(a.components.defuses)).reduce((n,a)=>n+(a.components.defuses??0),0);const hostage=base.hostageActions.filter((a)=>a.playerId===source.playerId&&allowed.has(a.roundId));const rescues=hostage.filter((a)=>a.event==='hostage_rescued').length,hurts=hostage.filter((a)=>a.event==='hostage_hurt').length;const objectiveSignals=base.scenario==='BOMB'?{'objective:plants':.05*plants/.12355/tRounds,'objective:defuses':.05*defuses/.07155950973368645/ctRounds}:{'objective:hostageRescues':.08*rescues/.026835947523339676/ctRounds,'objective:hostageHurts':-.02*hurts/.22414985539395899/allowed.size};p4CPlus={...p4BPlus,objectiveSignals};}
  return{profileKey:source.profileKey,playerId:source.playerId,teamId:source.teamId,scenario:base.scenario,rounds:allowed.size,validRounds:source.validRounds,tRounds,ctRounds,requiredInputStatus:'COMPLETE',p4BPlus,p4CPlus};
}
export function buildParticipationSidecar(snapshot:ParsedDemoSnapshot,match:MatchData,demoPath:string):ParticipationSidecar{
  const evidenceFacts=readParticipationEvidenceFacts(demoPath,snapshot);const lifeNames=evidenceFacts.lifecycleEventNames;
  const base=buildPreparedParticipationInput(snapshot,match,demoPath,{allowIncompleteRoster:true});const boundaryByRound=new Map(base.roundEvidence.map((r)=>[r.roundId,r]));const playerBySteam=new Map(match.players.map((p)=>[p.steamId,p.id]));const playerById=new Map(match.players.map((p)=>[p.id,p]));
  const lifecycle=evidenceFacts.lifecycle.flatMap((row)=>{const steam=row.steamId,playerId=steam?playerBySteam.get(steam)??(playerById.has(steam)?steam:null):null,tick=row.tick,kind=row.kind;return playerId&&tick!==null&&kind?[{playerId,tick,kind,order:row.sourceRowIndex}]:[];}).sort((a,b)=>a.tick-b.tick||a.order-b.order);
  const eventRounds=new Map(match.events.map((e)=>[e.id,e.roundId]));const rounds=match.rounds.filter((r)=>r.isValid);const roundById=new Map(rounds.map((r)=>[r.id,r]));const participation:ParticipationRound[]=[];
  for(const player of match.players){for(const round of rounds){const evidence=boundaryByRound.get(round.id),raw=evidence?.boundary;const liveStart=finite(raw?.liveStart)?raw.liveStart:0,liveEnd=finite(raw?.liveEnd)?raw.liveEnd:0;const complete=Boolean(evidence?.clean&&raw?.complete===true);const expected=round.sideByTeamId[player.teamId]==='T'?2:3;const starts=evidenceFacts.ticks.filter((row)=>row.tick===liveStart&&row.steamId===player.steamId);const start=starts.length===1?starts[0]:null;const alive=start?.isAlive??null;const teamNum=start?.sideNumber??null;const rows=lifecycle.filter((r)=>r.playerId===player.id&&r.tick>=liveStart&&r.tick<=liveEnd);const lastDisconnect=lifecycle.filter((r)=>r.playerId===player.id&&r.kind==='player_disconnect'&&r.tick<liveStart).at(-1);const lastReconnect=lifecycle.filter((r)=>r.playerId===player.id&&['player_connect','player_connect_full'].includes(r.kind)&&r.tick>(lastDisconnect?.tick??-1)&&r.tick<liveStart).at(-1);const death=match.events.find((e)=>e.roundId===round.id&&e.kind==='PLAYER_DEATH'&&e.targetId===player.id&&e.context?.phase==='LIVE');const gameplay=match.events.filter((e)=>e.roundId===round.id&&e.context?.phase==='LIVE'&&MATERIAL_KINDS.has(e.kind)&&(e.actorId===player.id||e.targetId===player.id||e.assisterId===player.id));const classified=classifyParticipation({globalComplete:complete,liveStart,liveEnd,startObserved:Boolean(start),startAlive:alive,startTeamNum:teamNum,expectedTeamNum:expected,disconnectedBeforeStart:Boolean(lastDisconnect&&!lastReconnect),reconnectedBeforeStart:Boolean(lastReconnect),deathTick:death?.tick??null,lifecycle:rows,gameplayEventCount:gameplay.length});participation.push({roundId:round.id,ordinal:round.ordinal,playerId:player.id,classification:classified.classification,reason:classified.reason,counted:classified.classification==='PRESENT_VERIFIED',side:round.sideByTeamId[player.teamId]??null,boundary:{liveStart,liveEnd,complete},evidence:{startObserved:Boolean(start),startAlive:alive,startTeamNum:teamNum,deathTick:death?.tick??null,gameplayEventCount:gameplay.length,lifecycle:rows.map(({kind,tick})=>({kind,tick}))}});}}
  const profiles:ParticipationProfile[]=base.preparedProfiles.map((source)=>{const player=playerById.get(source.playerId)!;const rows=participation.filter((r)=>r.playerId===player.id);const count=(c:ParticipationClass)=>rows.filter((r)=>r.classification===c).length;const allowed=new Set(rows.filter((r)=>r.counted).map((r)=>r.roundId));const prepared=prepareProfile(base,source,allowed,roundById,player.teamId,eventRounds);let status:ParticipationProfile['status']='ELIGIBLE',reason:null|string=null;if(count('ABSENT_FULL_ROUND_VERIFIED')>=3){status='PARTICIPATION_ABSENT_GT_2_ROUNDS';reason='THREE_OR_MORE_VERIFIED_FULL_ROUND_ABSENCES';}else if(count('PARTICIPATION_UNKNOWN')){status='PARTICIPATION_EVIDENCE_UNKNOWN';reason='PLAYER_ROUND_PARTICIPATION_UNKNOWN';}else if(prepared.p4CPlus.status==='UNKNOWN_APPLICABILITY'){status='UNKNOWN_APPLICABILITY';reason=prepared.p4CPlus.reason??'SCENARIO_UNKNOWN';}else if(prepared.p4CPlus.status!=='CALCULATED_RESEARCH_ONLY'){status='WITHHELD_INSUFFICIENT_VERIFIED_EXPOSURE';reason=prepared.p4CPlus.reason??'WITHHELD_INSUFFICIENT_VERIFIED_EXPOSURE';}return{profileKey:source.profileKey,playerId:player.id,teamId:player.teamId,status,reason,verifiedRounds:count('PRESENT_VERIFIED'),absentRounds:count('ABSENT_FULL_ROUND_VERIFIED'),partialRounds:count('INTERRUPTED_PARTIAL_ROUND'),unknownRounds:count('PARTICIPATION_UNKNOWN'),globalExcludedRounds:count('ROUND_GLOBAL_EVIDENCE_MISSING'),tRounds:prepared.tRounds,ctRounds:prepared.ctRounds,countedRoundIds:[...allowed].sort(),excludedRoundIds:rows.filter((r)=>!r.counted).map((r)=>r.roundId).sort(),prepared};});
  const stable={binding:{matchId:match.matchId,fileSha256:match.fileSha256,parserVersion:PARSER_LIBRARY_VERSION,normalizerVersion:NORMALIZER_VERSION},model:{preparedInputModel:C2S2_MODEL_VERSION,preparedInputDigest:C2S2_POLICY_DIGEST,referenceVersion:C2S2_REFERENCE_VERSION,policies:Object.values(P72_POLICY)},scenario:base.scenario,participation,profiles,provenance:{source:'RAW_DEMO_EVENTS_AND_TICKS' as const,lifecycleEvents:lifeNames,contextTags:CONTEXT_TAGS,s2AppliedBy:'@who-ruined/scoring scoreC2S2PreparedProfiles'}};return validateParticipationSidecar({schemaVersion:PARTICIPATION_SIDECAR_SCHEMA_VERSION,createdAt:new Date().toISOString(),fingerprint:digest(stable),...stable});
}
